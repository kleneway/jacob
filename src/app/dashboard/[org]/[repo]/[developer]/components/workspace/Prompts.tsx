/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faClipboard } from "@fortawesome/free-solid-svg-icons";
import { formatDistanceToNow } from "date-fns";
import Markdown, { type Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { toast } from "react-toastify";
import { type Prompt } from "~/server/api/routers/events";

type ComponentProps = {
  promptDetailsArray?: Prompt[];
};

export const PromptsComponent: React.FC<ComponentProps> = ({
  promptDetailsArray,
}) => {
  const [selectedPromptDetails, setSelectedPromptDetails] =
    useState<Prompt | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-redundant-type-constituents
  const renderers: Partial<Components | any> = {
    code: ({
      inline,
      className,
      children,
      ...props
    }: {
      inline: boolean;
      className: string;
      children: React.ReactNode;
    }) => {
      const match = /language-(\w+)/.exec(className ?? "");
      return !inline && match ? (
        <div className="relative">
          <button
            className="absolute right-2 top-0 rounded bg-gray-800 p-1 text-white"
            onClick={() => copyToClipboard(String(children))}
          >
            <FontAwesomeIcon icon={faClipboard} />
          </button>
          <SyntaxHighlighter
            style={oneDark}
            language={match[1]}
            PreTag="div"
            {...props}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      ) : (
        <div className={className} {...props}>
          {children}
        </div>
      );
    },
  };

  const openPanel = (promptDetails: Prompt) => {
    setSelectedPromptDetails(promptDetails);
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  return (
    <div className="min-h-full w-full flex-grow flex-col overflow-clip p-2 pt-0">
      <div className="w-full py-2 ">
        <h2 className="text-lg font-semibold text-white">Prompts</h2>
        <hr className="my-2 border-t border-gray-700" />
      </div>
      <div className="relative h-full w-full overflow-clip rounded-lg bg-gray-800/50 pb-2 text-white">
        <div className="hide-scrollbar h-full overflow-auto pb-8">
          <table className="w-full pb-2 text-left text-sm text-gray-400">
            <thead className="table-fixed bg-gray-700 text-xs uppercase text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Timestamp
                </th>
                <th scope="col" className="px-6 py-3">
                  Model
                </th>
                <th scope="col" className="px-6 py-3">
                  Tokens (cost)
                </th>
              </tr>
            </thead>
            <tbody>
              {promptDetailsArray?.map((promptDetails, index) => (
                <tr
                  key={index}
                  className="cursor-pointer bg-gray-800 hover:bg-gray-700"
                  onClick={() => openPanel(promptDetails)}
                >
                  <td className="px-6 py-4">
                    {formatDistanceToNow(
                      new Date(promptDetails?.metadata.timestamp ?? 0),
                      { addSuffix: true },
                    )}
                  </td>
                  <td className="px-6 py-4">{promptDetails.metadata.model}</td>
                  <td className="px-6 py-4">
                    {promptDetails.metadata.tokens > 1000
                      ? `${(promptDetails.metadata.tokens / 1000)?.toFixed(1)}K`
                      : promptDetails.metadata.tokens}{" "}
                    (${promptDetails.metadata.cost.toFixed(2)})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Slide-over panel for task details */}
        <Transition appear show={isPanelOpen} as={Fragment}>
          <Dialog
            as="div"
            className="hide-scrollbar fixed inset-0 z-10 overflow-y-auto"
            onClose={closePanel}
          >
            <div className="min-h-screen px-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
              </Transition.Child>
              <span
                className="inline-block h-full min-h-screen align-middle"
                aria-hidden="true"
              >
                &#8203;
              </span>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="ease-in duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <div className="fixed inset-y-0 right-0 max-w-full pl-10 sm:pl-16">
                  <div className="h-full w-screen max-w-md">
                    <div className="flex h-full flex-col overflow-y-scroll bg-gray-800/90 py-3 shadow-xl ">
                      <div className="flex justify-end px-4 sm:px-6">
                        <button
                          className="text-gray-400 outline-none hover:text-gray-200 "
                          onClick={closePanel}
                        >
                          <FontAwesomeIcon icon={faTimes} size="lg" />
                        </button>
                      </div>
                     