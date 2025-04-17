"use client";
import { useEffect, useState } from "react";
import { sendCheckWithAI, getQuestions, getAssessment } from "./actions";
import { useParams } from "next/navigation";
import { Database } from "@/utils/supabase/database.types";
import { DropdownMenu, RadioGroup, TextArea, Button } from "@radix-ui/themes";
import {
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiChevronUp,
  FiX,
} from "react-icons/fi";
import { FaRedo } from "react-icons/fa";
import { MathJax } from "better-react-mathjax";
import ChatWithAI from "@/components/ChatWithAI";
import Image from "next/image";
type Question = Database["public"]["Tables"]["questions"]["Row"];

export default function page() {
  const params = useParams();
  const [questions, setQuestions] = useState<Question[]>();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isCheckingWithAI, setIsCheckingWithAI] = useState(false);
  const [currentQuestionChat, setCurrentQuestionChat] = useState(
    "--- ### 🎨 You can style the"
  );
  const [assessmentName, setAssessmentName] = useState("Assessment"); // TODO: Fetch assessment name
  const [isVideosVisible, setIsVideosVisible] = useState(true);

  useEffect(() => {
    getAssessment({
      assessmentId: parseInt(params.assessment_id as string),
    }).then(({ data }) => {
      setAssessmentName(data?.[0].name || "Assessment");
    });

    getQuestions({
      assessmentId: parseInt(params.assessment_id as string),
    }).then(({ data }) => {
      setQuestions(data);
      if (data && data.length > 0) {
        setCurrentAnswer(data[currentQuestion]?.given_answer || "");
      }
    });
  }, []);

  useEffect(() => {
    if (questions && questions.length > 0) {
      setCurrentAnswer(questions[currentQuestion]?.given_answer || "");
    }
  }, [currentQuestion, questions]);

  function checkWithAI({
    question,
    answer,
  }: {
    question: Question;
    answer: string;
  }) {
    setIsCheckingWithAI(true);
    sendCheckWithAI({ question, answer }).then((data) => {
      if (data.error) {
        return console.error(data.error);
      }
      setQuestions(
        questions?.map((questionItem) => {
          if (questionItem.id == question.id) {
            return {
              ...questionItem,
              is_answered: true,
              is_correct: data.correct,
            };
          }
          return questionItem;
        })
      );
      setIsCheckingWithAI(false);
    });
  }

  const currentQuestionData = questions?.[currentQuestion];
  const isAnswered = currentQuestionData?.is_answered;
  const isCorrect = currentQuestionData?.is_correct;

  const handleCheckAnswer = () => {
    if (!currentQuestionData || !currentAnswer) return;

    setQuestions(
      questions?.map((questionItem) => {
        if (questionItem.id == currentQuestionData.id) {
          return {
            ...questionItem,
            given_answer: currentAnswer,
          };
        }
        return questionItem;
      })
    );
    checkWithAI({
      question: currentQuestionData,
      answer: currentAnswer,
    });
  };

  return (
    <div className="">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-hidden">
        {/* Left Column - Question Section */}
        <div className="flex flex-col space-y-6 justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#333333]">
              {assessmentName}
            </h1>
            <p className="mt-2 text-lg text-[#878787] ">
              Question {currentQuestion + 1} of {questions?.length || 0}
            </p>
          </div>

          {/* Question Navigation */}
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2 justify-between w-full">
              <div className="flex items-center gap-2">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    <button className="!bg-transparent flex items-center outline-none px-3 py-1.5 !border-2 !border-[#333333] text-[#333333] text-sm rounded-[4px] font-medium">
                      Select Question
                      <FiChevronDown size={20} className="ml-2" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content className="bg-[#333333] shadow-lg">
                    {questions?.map((question, index) => (
                      <DropdownMenu.Item
                        key={index}
                        onClick={() => {
                          setCurrentQuestion(index);
                          setCurrentAnswer(
                            questions?.[index].given_answer
                              ? questions?.[index].given_answer
                              : ""
                          );
                        }}
                        className="flex items-center justify-between px-4 py-2 hover:bg-[#333333]"
                      >
                        <span>Question {index + 1}</span>
                        {question.is_correct ? (
                          <span className="text-green-500">✓</span>
                        ) : question.is_answered ? (
                          <span className="text-red-500">×</span>
                        ) : null}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Root>

                <button
                  onClick={() => {
                    if (questions && currentQuestion < questions.length - 1) {
                      setCurrentAnswer(
                        questions?.[currentQuestion + 1].given_answer || ""
                      );
                      setCurrentQuestion((prev) => prev + 1);
                    }
                  }}
                  className="!bg-transparent flex items-center outline-none px-3 py-1.5 !border-2 !border-[#333333] text-[#333333] text-sm rounded-[4px] font-medium"
                >
                  <FaRedo size={20} className="mr-2" />
                  Get a similar question
                </button>
              </div>

              <button
                onClick={() => {
                  if (questions && currentQuestion < questions.length - 1) {
                    setCurrentAnswer(
                      questions?.[currentQuestion + 1].given_answer || ""
                    );
                    setCurrentQuestion((prev) => prev + 1);
                  }
                }}
                className="!bg-[#333333] justify-end flex items-center outline-none px-3 py-1.5 !border-2 !border-[#333333] text-white text-sm rounded-[4px] font-medium hover:opacity-90"
              >
                Next Question
                <FiChevronRight size={20} className="ml-2" />
              </button>
            </div>
          </div>

          {/* Question Content */}
          {currentQuestionData ? (
            <div
              className={`bg-white rounded-lg p-6 transition-colors
              ${
                isCorrect
                  ? "border-2 border-green-500"
                  : isAnswered
                  ? "border-2 border-red-500"
                  : "border-0"
              }
            `}
            >
              <MathJax className="text-[#333333] mb-6">
                {currentQuestionData.question}
              </MathJax>

              <div className="space-y-4">
                {currentQuestionData.question_type === "MCQ" && (
                  <RadioGroup.Root
                    value={currentAnswer}
                    onValueChange={(value) => {
                      setCurrentAnswer(value);
                      setQuestions(
                        questions?.map((questionItem) => {
                          if (questionItem.id == currentQuestionData.id) {
                            return {
                              ...questionItem,
                              given_answer: value,
                            };
                          }
                          return questionItem;
                        })
                      );
                    }}
                    className="space-y-2"
                  >
                    {currentQuestionData.answers?.map((answer, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-3 p-3"
                      >
                        <RadioGroup.Item
                          value={answer}
                          className="w-4 h-4 !border-2 before:!bg-transparent before:!border-2 before:!border-[#333333] data-[state=checked]:after:!bg-[#333333]"
                        />
                        <label className="text-[#333333]">{answer}</label>
                      </div>
                    ))}
                  </RadioGroup.Root>
                )}

                {currentQuestionData.question_type === "BOOL" && (
                  <RadioGroup.Root
                    value={currentAnswer}
                    onValueChange={(value) => {
                      setCurrentAnswer(value);
                      setQuestions(
                        questions?.map((questionItem) => {
                          if (questionItem.id == currentQuestionData.id) {
                            return {
                              ...questionItem,
                              given_answer: value,
                            };
                          }
                          return questionItem;
                        })
                      );
                    }}
                    className="space-y-2"
                  >
                    {["true", "false"].map((value) => (
                      <div
                        key={value}
                        className="flex items-center space-x-3 p-3"
                      >
                        <RadioGroup.Item
                          value={value}
                          className="w-4 h-4 !border-2 before:!bg-transparent before:!border-2 before:!border-[#333333] data-[state=checked]:after:!bg-[#333333]"
                        />
                        <label className="text-[#333333] capitalize">
                          {value}
                        </label>
                      </div>
                    ))}
                  </RadioGroup.Root>
                )}

                {currentQuestionData.question_type === "LATEX" && (
                  <textarea
                    value={currentAnswer}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCurrentAnswer(value);
                      setQuestions(
                        questions?.map((questionItem) => {
                          if (questionItem.id == currentQuestionData.id) {
                            return {
                              ...questionItem,
                              given_answer: value,
                            };
                          }
                          return questionItem;
                        })
                      );
                    }}
                    placeholder="Enter your answer here..."
                    className="w-full min-h-[125px] p-3 rounded-md border text-sm border-[#333333] outline-none shadow-[1.5px_3px_0_0px_rgba(51,51,51,1)]
                             !bg-white !text-[#333333] "
                  />
                )}
              </div>

              <div className="flex justify-between items-center space-x-4 mt-6">
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={handleCheckAnswer}
                    disabled={isCheckingWithAI || !currentAnswer}
                    className={
                      isCheckingWithAI || !currentAnswer
                        ? " !bg-[#878787] !text-white"
                        : "!bg-[#333333] !text-white"
                    }
                  >
                    {isCheckingWithAI ? "Checking..." : "Check With AI"} ✨
                  </Button>

                  <button
                    onClick={() => {
                      const eventStream = new EventSource(
                        `http://localhost:8000/explanation?problem=${encodeURIComponent(
                          currentQuestionData.question || ""
                        )}`
                      );
                      eventStream.onmessage = (e) => {
                        console.log("woah", e.data);
                        if (e.data === "[DONE]") {
                          eventStream.close();
                          return;
                        }
                        setCurrentQuestionChat((prev) => prev + e.data);
                      };
                      eventStream.onerror = (e) => {
                        console.error(e);
                        eventStream.close();
                      };
                    }}
                    className="text-[#4169E1] text-sm font-medium hover:underline"
                  >
                    How do I solve this?
                  </button>
                </div>

                {currentQuestionData.is_answered &&
                  !currentQuestionData.is_correct && (
                    <FiX size={20} className="text-red-500" />
                  )}
                {currentQuestionData.is_correct == true && (
                  <FiCheck size={20} className="text-green-500" />
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-6 animate-pulse">
              {/* Question text skeleton */}
              <div className="space-y-3 mb-6">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>

              {/* Answer input skeleton */}
              <div className="h-32 bg-gray-200 rounded w-full mb-6"></div>

              {/* Buttons skeleton */}
              <div className="flex items-center gap-4">
                <div className="h-9 bg-gray-200 rounded w-32"></div>
                <div className="h-9 bg-gray-200 rounded w-48"></div>
              </div>
            </div>
          )}

          {/* Youtube video suggestions section */}
          <div
            className={`flex flex-col space-y-6 transition-all duration-300 ease-in-out ${
              isVideosVisible ? "" : "translate-y-[150px]"
            } overflow-y-clip`}
          >
            <div
              className="flex items-center space-x-2 text-[#333333] flex-col hover:cursor-pointer"
              onClick={() => setIsVideosVisible(!isVideosVisible)}
            >
              <FiChevronDown
                size={20}
                className={`transition-transform duration-300 ${
                  isVideosVisible ? "" : "rotate-180"
                }`}
              />
              <p className="text-sm font-medium">Suggested YouTube videos</p>
            </div>
            <div className="flex space-x-4 pb-3 pr-1 max-w-full mt-auto text-black overflow-x-scroll">
              <div className="h-28 min-w-44 border border-[#333333] rounded-md shadow-[2px_3px_0_0px_rgba(51,51,51,1)]">
                <Image
                  src="/images/youtube.png"
                  alt="Youtube"
                  width={100}
                  height={100}
                />
              </div>
              <div className="h-28 min-w-44 border border-[#333333] rounded-md shadow-[2px_3px_0_0px_rgba(51,51,51,1)]">
                <Image
                  src="/images/youtube.png"
                  alt="Youtube"
                  width={100}
                  height={100}
                />
              </div>
              <div className="h-28 min-w-44 border border-[#333333] rounded-md shadow-[2px_3px_0_0px_rgba(51,51,51,1)]">
                <Image
                  src="/images/youtube.png"
                  alt="Youtube"
                  width={100}
                  height={100}
                />
              </div>
              <div className="h-28 min-w-44 border border-[#333333] rounded-md shadow-[2px_3px_0_0px_rgba(51,51,51,1)]">
                <Image
                  src="/images/youtube.png"
                  alt="Youtube"
                  width={100}
                  height={100}
                />
              </div>
              <div className="h-28 min-w-44 border border-[#333333] rounded-md shadow-[2px_3px_0_0px_rgba(51,51,51,1)]">
                <Image
                  src="/images/youtube.png"
                  alt="Youtube"
                  width={100}
                  height={100}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Chat Section */}
        <div className="lg:border-l lg:border-gray-200 lg:dark:border-gray-700 lg:pl-8">
          <ChatWithAI
            currentQuestionChat={currentQuestionChat}
            setCurrentQuestionChat={setCurrentQuestionChat}
          />
        </div>
      </div>
    </div>
  );
}
