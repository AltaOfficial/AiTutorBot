#!/usr/bin/env python3

# Docs: https://platform.openai.com/docs/guides/structured-outputs
# Additional resources: https://github.com/OthersideAI/chronology

from flask import Flask, jsonify, request, Response, sessions
from openai import OpenAI
from dotenv import load_dotenv
from flask_cors import CORS
import json
from client import supabase
from clerk_backend_api import Clerk
from clerk_backend_api.jwks_helpers import AuthenticateRequestOptions
import os
import base64

# Load environment variables
load_dotenv()

# Initialize OpenAI client
chatgpt_client = OpenAI()

# Initialize Clerk client
clerk_client = Clerk(os.environ.get("CLERK_SECRET_KEY"))

server = Flask(__name__)
CORS(server, supports_credentials=True)

@server.route('/')
def index():
    response = supabase.table("assessments").select("*").eq("user_id", "user_2t8a9D9AoXQQmR84PB4yRI2B1Kc").execute().data
    request_state = clerk_client.authenticate_request(request, AuthenticateRequestOptions(authorized_parties=["http://frontend:3000", "http://localhost:3000"]))
    print(request_state)
    print(response)
    return jsonify({ "message": response })  # Return response as JSON

@server.route("/generateassessement", methods=["POST"])
def generate_assessment():
    request_state = clerk_client.authenticate_request(request, AuthenticateRequestOptions(authorized_parties=["http://frontend:3000", "http://localhost:3000"]))
    if request_state.is_signed_in != True:
        return jsonify({"message": "User not logged in"})
    user_id = request_state.payload.get("sub")
    num_of_questions = request.form.get("numOfQuestions", 10) # number of questions to produce
    form_images = request.files.getlist("uploadedFiles") # images to create a question from
    print(form_images)
    text_input = request.form.get("textInput", "") # Get textInput from formData
    
    images_base64_encoded = []
    for image in form_images:
        if image.filename == "undefined":
            continue
        current_image_base64 = base64.b64encode(image.read()).decode("utf-8") # openai api takes in images as base64
        images_base64_encoded.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{current_image_base64}"}})

    input_messages = [{
            "role": "system",
            "content": f"""You are an assessment generator.

            These are the question types you can choose from:
            
            - Multiple choice: The "question_type" value should be "MCQ".
            - True or false: The "question_type" value should be "BOOL".
            - word input problem: The "question_type" value should be "LATEX". Prefer these over the other 2
            
            **MathJax Usage:**  
            - Apply MathJax **to questions and answers wherever beneficial**, including MCQ and BOOL questions.  
            - Use \\(...\\) for inline math (e.g., "Solve for \\(x\\) in \\(2x + 3 = 7\\).").  
            - Use \\[...\\] for display math (e.g., "Evaluate: \\[ \\int_0^1 x^2 \\,dx \\]").  

            **Assessment Requirements:**  
            - Generate an assessment of {num_of_questions} questions based on the input.
            - Use MathJax in **both questions and answers** whenever it improves clarity.
            - The response must be a **valid JSON object** with:
            - `"assessment_name"` (string)  
            - `"questions"` (array of objects). Each object must have:
                - `"question"` (string, using MathJax when beneficial)
                - `"question_type"` (string, either `"MCQ"`, `"BOOL"`, or `"LATEX"`)
                - If `"question_type"` is `"MCQ"` or `"BOOL"`, it must include `"answers"` (array of strings, using MathJax where beneficial).

            **Response Format:**  
            - Return a **valid JSON object**.  
            - Do **not** include any explanations, comments, or extra text—only return the JSON object.
            """
        }]

    if(len(images_base64_encoded) > 0 and text_input):
        input_messages.append({
            "role": "user",
            "content": [{"type": "text", "text": text_input}, *images_base64_encoded]
        })
    elif(len(images_base64_encoded) > 0 and not text_input):
        input_messages.append({
            "role": "user",
            "content": [*images_base64_encoded]
        })
    elif(text_input and not len(images_base64_encoded) > 0):
        input_messages.append({
            "role": "user",
            "content": [{"type": "text", "text": text_input}]
        })

    completion = chatgpt_client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={ "type": "json_object" },
        messages=input_messages
    )

    completion_text = completion.choices[0].message.content

    try:
        parsed_assessment = json.loads(completion_text.strip())  # Ensure the response is in proper JSON format
    except json.JSONDecodeError as exception:
        print(exception)
        parsed_assessment = {"error": "Invalid JSON response from AI"}

    print(completion_text)
    print(parsed_assessment)
    print(parsed_assessment["assessment_name"])
    questions = []

    assesment_id = supabase.table("assessments").insert({ "user_id": user_id, "total_questions": num_of_questions, "name": parsed_assessment["assessment_name"], "course_id": request.form.get("courseId", 1) }).execute().data[0]["id"]
    print(assesment_id)
    for question in parsed_assessment["questions"]:
        if question["question_type"] == "MCQ":
            questions.append({
                "question": question["question"],
                "question_type": question["question_type"],
                "is_answered": False,
                "assessment_id": assesment_id,
                "answers": question["answers"]
            })
        else:
            questions.append({
                "question": question["question"],
                "question_type": question["question_type"],
                "is_answered": False,
                "assessment_id": assesment_id,
            })
    supabase.table("questions").insert(questions).execute()
    return jsonify({"message": {
        "generated_assessement": parsed_assessment,
        "status": "Generation complete!",
    }})

@server.route("/checkwithai", methods=["POST"])
async def check_with_ai():
    user_input = request.get_json()
    print(user_input)
    completion = chatgpt_client.chat.completions.create(
    model="gpt-4o",
    response_format={"type": "json_object"},
    messages=[{
        "role": "system",
        "content": f"""
            You are an assessment grader.

            (answer/question might be in mathjax format)
            This is the question: {user_input["question"]}
            This is the answer: {user_input["answer"]}

            Provide a numerical response:
            - 1 if the answer is correct
            - 0 if the answer is incorrect

            Response format (JSON only):
            {{
                "correct": (1 or 0)
            }}

            Only return valid JSON. Do not include explanations or extra text, no commas NOTHING litterally just the json.
        """
        }],
    )

    completion_text = completion.choices[0].message.content
    print(completion_text)
    print(user_input["question"])
    print(user_input["answer"])

    try:
        parsed_response = json.loads(completion_text)  # Ensure the response is in proper JSON format
    except json.JSONDecodeError:
        parsed_response = {"error": "Invalid JSON response from AI"}

    return jsonify({"correct": parsed_response["correct"]})

@server.route("/explanation")
def explain_problem():
    problem = request.args.get("problem")

    def explanation_stream():
        stream = chatgpt_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": (
                    "You are a math and problem-solving expert. Format your response in GitHub-Flavored Markdown (GFM):\n\n"
                    "1. Use proper GFM syntax for all formatting\n"
                    "2. For math expressions, use code blocks with math delimiters:\n"
                    "   ```math\n"
                    "   x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}\n"
                    "   ```\n"
                    "3. For inline math, use single backticks with math delimiters: `$x^2$`\n"
                    "4. Use proper markdown headings with '#'\n"
                    "5. For lists, ensure proper spacing before and after\n"
                    "6. Use bold with ** and italic with *\n"
                    "7. Code examples should use proper code fences with language specification\n"
                    "8. Use > for blockquotes\n"
                    "9. Use proper line breaks between sections\n"
                )},
                {"role": "user", "content": f"Explain how to solve this problem in detail, using proper markdown formatting:\n\n{problem}"}
            ],
            stream=True
        )

        for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                yield f"data: {chunk.choices[0].delta.content}\n\n"
        
        yield "data: [DONE]\n\n"

    return Response(explanation_stream(), mimetype="text/event-stream")

if __name__ == "__main__":
    server.run(host="0.0.0.0", port=8000, threaded=True, debug=True)
