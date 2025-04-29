import {
    IconCheck,
    IconCopy,
    IconEdit,
    IconHeadset,
    IconRobot,
    IconTrash,
    IconUser,
  } from '@tabler/icons-react';
  import { FC, memo, useContext, useEffect, useRef, useState } from 'react';
  import { useTranslation } from 'next-i18next';
  import { saveConversation, updateConversation } from '@/utils/app/conversation';
  import { Message, Role } from '@/types/chat';
  import HomeContext from '@/pages/api/home/home.context';
  
  import { FollowupComponent } from '@/components/Plugins/Followup';
  import { CodeBlock } from '../Markdown/CodeBlock';
  import { MemoizedReactMarkdown } from '../Markdown/MemoizedReactMarkdown';
  
  import rehypeMathjax from 'rehype-mathjax';
  import remarkGfm from 'remark-gfm';
  import remarkMath from 'remark-math';
  import { FeedbackButtons } from '@/components/Plugins/Feedback/FeedbackButtons';
  import { getEndpoint } from '@/utils/app/api';
  import { AgentAvatar } from '../Plugins/Avatar/AgentAvatar';
  import { BotAvatar } from '../Plugins/Avatar/BotAvatar';
  import { UserAvatar } from '../Plugins/Avatar/UserAvatar';
  import { VirtualAgentAvatar } from '../Plugins/Avatar/VirtualAgentAvatar';
  import { Constants } from '@/utils/app/const';
  import { useRouter } from 'next/router';
  import { getIdTokenFromSession, getURLQueryParam, sanitizeStausUpdateText } from '@/utils/app/helper';
  import ReactMarkdown from 'react-markdown';
  import rehypeRaw from 'rehype-raw';
  import CardMessage from '../Plugins/Typewriter/Card';
  import { getReactMarkDownCustomComponents } from '../Plugins/Typewriter/CustomComponents';
  import { SystemAgentAvatar } from '../Plugins/Avatar/SystemAvatar';
  import { Typewriter } from '../Plugins/Typewriter/Typewriter';
  
  export interface Props {
    message: Message;
    messageIndex: number;
    onEdit?: (editedMessage: Message) => void;
    onSend?: (message: Message) => void;
  }
  
  export const ChatMessage: FC<Props> = memo(({ message, messageIndex, onEdit, onSend }) => {
    const router = useRouter()
  
    // return if the there is nothing to show
    if(message?.content === '' && !message?.attachment?.content && !message?.attachment?.compressedContent) {
      return
    }
  
    const { t } = useTranslation('chat');
  
    const {
      state: { selectedConversation, conversations, currentMessage, messageIsStreaming, appConfig },
      dispatch: homeDispatch,
    } = useContext(HomeContext);
  
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [messageContent, setMessageContent] = useState(message.content);
    const [messagedCopied, setMessageCopied] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const processedMessageIdsRef = useRef(new Set());
  
      const textareaRef = useRef<HTMLTextAreaElement>(null);
  
    const toggleEditing = () => {
      setIsEditing(!isEditing);
    };
  
    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessageContent(event.target.value);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    };
  
    const handleEditMessage = () => {
      if (message.content != messageContent) {
        if (selectedConversation && onEdit) {
          onEdit({ ...message, content: messageContent });
        }
      }
      setIsEditing(false);
    };
  
    const handleDeleteMessage = () => {
      if (!selectedConversation) return;
  
      const { messages } = selectedConversation;
      const findIndex = messages.findIndex((elm) => elm === message);
  
      if (findIndex < 0) return;
  
      if (
        findIndex < messages.length - 1 &&
        messages[findIndex + 1].role === Constants.ROLES.ASSISTANT
      ) {
        messages.splice(findIndex, 2);
      } else {
        messages.splice(findIndex, 1);
      }
      const updatedConversation = {
        ...selectedConversation,
        messages,
      };
  
      const { single, all } = updateConversation(
        updatedConversation,
        conversations,
      );
      homeDispatch({ field: 'selectedConversation', value: single });
      homeDispatch({ field: 'conversations', value: all });
    };
  
    const handlePressEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !isTyping && !e.shiftKey) {
        e.preventDefault();
        handleEditMessage();
      }
    };
  
    const copyOnClick = () => {
      if (!navigator.clipboard) return;
  
      navigator.clipboard.writeText(message.content).then(() => {
        setMessageCopied(true);
        setTimeout(() => {
          setMessageCopied(false);
        }, 2000);
      });
    };
  
    const getIRQAResponse = async ({queryId = ''}) => {
      const system = router?.query?.bot ?? 'nvhelp'
      const authToken = getIdTokenFromSession() ?? '';
      const userName = sessionStorage.getItem('user') || '';
  
      const irqaBody = JSON.stringify({
        system,
        queryId,
        userName,
      });
      const irqaEndPoint = getEndpoint({ service: 'irqa' });
      const irqaResponse = await fetch(`${window.location.origin}\\${irqaEndPoint}` , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}`},
        body: irqaBody,
      });
      console.log("irqaEndPoint", `${window.location.origin}\\${irqaEndPoint}`)
  
      try {
          const data = await irqaResponse.json();
          console.log("data", data)
          const uuid = data?.Response?.Json?.UUID
          if(uuid) {
            let selectedConversation = JSON.parse(sessionStorage.getItem('selectedConversation') || '{}');
            let messages = selectedConversation?.messages || []
            let updatedMessages = messages.map((message) => {
              if(message?.id === queryId){
                message.uuid = uuid
                return message
              }
              else{
                return message
              }
            })
  
            selectedConversation.messages = updatedMessages
            homeDispatch({
              field: 'selectedConversation',
              value: selectedConversation,
            });
        
            saveConversation(selectedConversation);
          }
          return data
      } catch (error) {
          // Handle errors
          console.error('An error occurred during request to irqa', error);
      }
    }
  
    useEffect(() => {
      setMessageContent(message.content);
    }, [message.content]);
  
    useEffect(() => {
      const saveConversation = async () => {
        const irqaData = await getIRQAResponse({queryId: message.id})
        if(irqaData?.Response?.Json?.UUID) {
          const saveConversationEndPoint = getEndpoint({service: 'saveconversation'})
          const saveConversationBody = {
            SourceSystem: router?.query?.bot ?? 'nvhelp',
            RivaResponse: irqaData,
            userName: window.sessionStorage.getItem('user'),
          };
          let body;
          body = JSON.stringify(saveConversationBody);
          const response = await fetch(`${window.location.origin}\\${saveConversationEndPoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getIdTokenFromSession()}`
            },
            body,
          });
          if (!response.ok) {
            console.error('save conversation error')
          }
        }
        else {
          console.log('UUID not found in irqa response, skipping saveconversation')
        }
      }
  
      // Check if message ID is not already processed and not streaming
      if (message?.role === Constants.ROLES.ASSISTANT && !message?.uuid && message?.id && !messageIsStreaming && !processedMessageIdsRef.current.has(message.id)) {
        saveConversation();
        // Add the message ID to the set after processing
        processedMessageIdsRef.current.add(message.id);
      }
  
    }, [message.id, messageIsStreaming]);
  
  
    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [isEditing]);
  
    const shouldStream = () => {
      let enableTypeWriter = true
      try {
        const host = getURLQueryParam({ param: 'host' })
        const numberMessages = selectedConversation?.messages.length || 0
        // Disable type writer if message is not streaming and host is sharepoint and it if not the last message
        const isLastMessage = messageIndex === numberMessages - 1
        enableTypeWriter = messageIsStreaming && host !== 'sharepoint' && isLastMessage
      } catch (error) {
        console.error('error - determining if type writer should be enabled', error);
      }
      return enableTypeWriter
    }
    console.log(appConfig)
    return (
      <div
        className={`group md:px-4 ${
          (message.role === Constants.ROLES.ASSISTANT || message.role === Constants.ROLES.AGENT)
            ? 'border-b border-black/10 bg-gray-50 text-gray-800 dark:border-gray-900/50 dark:bg-[#444654] dark:text-gray-100'
            : 'border-b border-black/10 bg-white text-gray-800 dark:border-gray-900/50 dark:bg-[#343541] dark:text-gray-100'
        }`}
        style={{ overflowWrap: 'anywhere' }}
      >
        <div className="relative m-auto flex p-4 text-base sm:w-[95%] 2xl:w-[60%] md:gap-6 md:py-6 lg:px-0">
          <div className="min-w-[40px] text-right font-bold">
            {message.role === Constants.ROLES.ASSISTANT ? (
              <BotAvatar src={appConfig?.botIcon || 'nvbotgreen.png'}/>
            ) : (
              message.role === Constants.ROLES.AGENT ? <AgentAvatar initials={message?.agentDetails?.agentInitials}/> :
              message.role === Constants.ROLES.VIRTUAL_AGENT ? <VirtualAgentAvatar /> :
              message?.role === Constants.ROLES.USER ? <UserAvatar /> : <SystemAgentAvatar />
            )}
          </div>
  
          <div className="w-full dark:prose-invert">
            {message.role === Constants.ROLES.USER ? (
              <div className="flex w-full">
                {isEditing ? (
                  <div className="flex w-full flex-col">
                    <textarea
                      ref={textareaRef}
                      className="w-full resize-none whitespace-pre-wrap border-none dark:bg-[#343541]"
                      value={messageContent}
                      onChange={handleInputChange}
                      onKeyDown={handlePressEnter}
                      onCompositionStart={() => setIsTyping(true)}
                      onCompositionEnd={() => setIsTyping(false)}
                      style={{
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        lineHeight: 'inherit',
                        padding: '0',
                        margin: '0',
                        overflow: 'hidden',
                      }}
                    />
  
                    <div className="mt-10 flex justify-center space-x-4">
                      <button
                        className="h-[40px] rounded-md border border-neutral-300 px-4 py-1 text-sm font-medium text-neutral-700 enabled:hover:bg-[#76b900] disabled:opacity-50"
                        onClick={handleEditMessage}
                        disabled={messageContent.trim().length <= 0}
                      >
                        {t('Save & Submit')}
                      </button>
                      <button
                        className="h-[40px] rounded-md border border-neutral-300 px-4 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        onClick={() => {
                          setMessageContent(message.content);
                          setIsEditing(false);
                        }}
                      >
                        {t('Cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="prose whitespace-pre-wrap dark:prose-invert flex-1 w-full">
                    <ReactMarkdown
                      className="prose dark:prose-invert flex-1 w-full flex-grow max-w-none whitespace-normal"
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeRaw] as any}
                      linkTarget="_blank"
                      components={getReactMarkDownCustomComponents()}
                    >
                      {`${message?.content ? message?.content : ''}${message?.attachment?.compressedContent ? `<img src='${message?.attachment?.compressedContent}' />`  : '' }`}
                    </ReactMarkdown>
                  </div>
                )}
  
                { message?.id && !isEditing && (
                  <div className="absolute right-2 flex flex-col md:flex-row gap-1 items-center md:items-start justify-end md:justify-start">
                    <button
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      onClick={toggleEditing}
                    >
                      <IconEdit size={20} />
                    </button>
                    <button
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      onClick={handleDeleteMessage}
                    >
                      <IconTrash size={20} />
                    </button>
                  </div>
                )} 
              </div>
            ) : (
              <div className="flex flex-col w-[90%]">
                <div className="flex flex-row">
                  {
                    shouldStream() ? 
                    (
                      <MemoizedReactMarkdown
                        className="prose dark:prose-invert flex-1 w-full flex-grow max-w-none whitespace-normal"
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeMathjax]}
                        components={getReactMarkDownCustomComponents(onSend)}
                        handleClick={onSend}
                      >
                        {message.content}
                      </MemoizedReactMarkdown>
                    ) 
                      : 
                    (
                      <ReactMarkdown
                        className="prose dark:prose-invert flex-1 w-full flex-grow max-w-none whitespace-normal"
                        remarkPlugins={[remarkGfm, [remarkMath, {
                          singleDollarTextMath: false,
                          }]]
                        }
                        rehypePlugins={[rehypeRaw] as any}
                        linkTarget="_blank"
                        components={getReactMarkDownCustomComponents(onSend)}
                      >
                        {sanitizeStausUpdateText(message.content)}
                      </ReactMarkdown>
  
                    )
                  }
                  { message?.id &&
                    <div className="absolute right-2 flex flex-col md:flex-row gap-1 items-center md:items-start justify-end md:justify-start">
                      {messagedCopied ? (
                        <IconCheck
                          size={20}
                          className="text-green-500 dark:text-green-400"
                        />
                      ) : (
                        <button
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                          onClick={copyOnClick}
                        >
                          <IconCopy size={20} />
                        </button>
                      )}
                      {<FeedbackButtons message={message} />}
                    </div>
                  } 
                </div>
                {message.followup && <FollowupComponent message={message} handleClick={onSend}></FollowupComponent>}
              </div>
            )}
          </div>
          
        </div>
        
      </div>
    );
  });
  ChatMessage.displayName = 'ChatMessage';
  
  