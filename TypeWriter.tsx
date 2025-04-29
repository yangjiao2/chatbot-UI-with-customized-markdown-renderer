import React, { FC, memo, useContext } from 'react';
import ReactMarkdown, { Options } from 'react-markdown';
import HomeContext from '@/pages/api/home/home.context';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { Constants } from '@/utils/app/const';
import rehypeRaw from 'rehype-raw';
import { getReactMarkDownCustomComponents } from './CustomComponents';
import { sanitizeStausUpdateText } from '@/utils/app/helper';

/* eslint-disable react-hooks/exhaustive-deps */
export const Typewriter = ({
  speed = 30,
  typingDelay = 50,
  handleClick,
  children: text,
  ...otherProps
}) => {
  const [currentText, setCurrentText] = React.useState('');
  const [__timeout, set__Timeout] = React.useState(null);
  const [isTyping, setIsTyping] = React.useState(true);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const { dispatch: homeDispatch, state: { llms, selectedModel, messageIsStreaming }} = useContext(HomeContext);
  const enableStream = (llms.find(llm => llm.name === selectedModel)?.stream ?? true) && messageIsStreaming;
  
  React.useEffect(() => {
    setIsTyping(true);
    startTyping();

    return () => {
      __timeout && clearTimeout(__timeout);
    };
  }, [text]);

  React.useEffect(() => {
    let rawText = getRawText()[currentIndex];
    if (isTyping) {
      if (currentText.length < rawText.length) {
        set__Timeout(setTimeout(type, speed));
      }
    } else {
      if (currentText.length === 0) {
        const textArray = getRawText();
        let index =
          currentIndex + 1 === textArray.length ? 0 : currentIndex + 1;
        if (index === currentIndex) {
          setIsTyping(true);
          setTimeout(startTyping, typingDelay);
        } else {
          setTimeout(() => setCurrentIndex(index), typingDelay);
        }
      }
    }
    return () => {
      __timeout && clearTimeout(__timeout);
    };
  }, [currentText]);

  React.useEffect(() => {
    setIsTyping(true);
    startTyping();
    return () => {
      __timeout && clearTimeout(__timeout);
    };
  }, [currentIndex]);

  function getRawText() {
    return typeof text === 'string' ? [text] : [...text];
  }

  function startTyping() {
    set__Timeout(
      setTimeout(() => {
        type();
      }, speed),
    );
  }

  function type() {
    let rawText = getRawText()[currentIndex];
        rawText = sanitizeStausUpdateText(rawText)
    
    if (!enableStream) {
      setCurrentText(rawText);
      return;
    }

    if (currentText.length < rawText.length) {
      let displayText = '';
      let spaceIndex = rawText.indexOf(' ', currentText.length + 1);
      if (spaceIndex === -1) {
        spaceIndex = rawText.indexOf('/', currentText.length + 1);
      }
      if (spaceIndex === -1) {
        displayText = rawText;
      } else {
        displayText = rawText.substr(0, spaceIndex);
      }
      setCurrentText(displayText);
    }
  }

  return (
    <div
      style={{
        fontSize: '1rem',
        whiteSpace: 'initial',
      }}
      className="type-writer stream-text-container"
      {...otherProps}
    >
      {/* eslint-disable-next-line react/no-children-prop */}
      <ReactMarkdown
        className="prose dark:prose-invert flex-1 w-full flex-grow max-w-none whitespace-normal"
        remarkPlugins={[remarkGfm, [remarkMath, {
          singleDollarTextMath: false,
          }]]
        }
        rehypePlugins={[rehypeRaw] as any}
        linkTarget="_blank"
        components={getReactMarkDownCustomComponents(handleClick)}
      >
        {currentText}
      </ReactMarkdown>
    </div>
  );
};