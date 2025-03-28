import { Button, DropdownMenu, TextField, HoverCard } from "@radix-ui/themes";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export default function ChatWithAI({
  currentQuestionChat,
}: {
  currentQuestionChat: string;
}) {
  const [messageInput, setMessageInput] = useState("");

  const sendMessage = () => {
    if (!messageInput.trim()) return;
  };

  return (
    <div className="p-3 bg-stone-800 h-screen rounded-lg flex flex-col gap-5">
      <div className="h-8 flex flex-row-reverse justify-between place-items-center">
        <div className="flex flex-row-reverse gap-4">
          <Button>Restart Chat</Button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button disabled>
                Choose Model (ChatGPT 4o-mini) <DropdownMenu.TriggerIcon />
              </Button>
            </DropdownMenu.Trigger>
          </DropdownMenu.Root>
        </div>

        <div>
          <p className="text-3xl">ChatGPT</p>
        </div>
      </div>
      <div className="bg-stone-900 h-screen flex flex-col-reverse rounded-lg items-end p-3 overflow-x-scroll">
        <div className="flex w-full place-self-end">
          <TextField.Root className="w-full self-center flex ">
            <TextField.Slot side="right">
              <Button onClick={sendMessage}>Send</Button>
            </TextField.Slot>
          </TextField.Root>
        </div>
        <div>
          <ReactMarkdown
            children={currentQuestionChat}
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          ></ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
