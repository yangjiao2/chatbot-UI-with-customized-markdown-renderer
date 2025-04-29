
'use client';
import { CodeBlock } from '@/components/Markdown/CodeBlock';
import CardMessage from '@/components/Plugins/Typewriter/Card';
import Picker from './Picker';
import InputText from './InputText';
import CatalogCardMessage from './CatalogCard';
import Chart from './Chart';

import { useContext } from 'react';
import HomeContext from '@/pages/api/home/home.context';
import { getURLQueryParam } from '@/utils/app/helper';

import React, { useState, ReactNode } from 'react';

export const CitationList = ({ children }: { children: ReactNode }) => {
  // Example usage:
  // <citationlist>
  //  [Link 1](https://example.com)
  //  [Link 2](https://example.com)
  //  [Link 3](https://example.com)
  //  [Link 4](https://example.com)
  //  [Link 5](https://example.com)
  // </citationlist>

  const [expanded, setExpanded] = useState(false);

  const links = React.Children.toArray(children).filter(
    (child: any) => child?.type === 'a'
  );

  const nonLinks = React.Children.toArray(children).filter(
    (child: any) => child?.type !== 'a'
  );

  const visible = expanded ? links : links.slice(0, 3);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {visible.map((link, index) => (
        <span key={index} className="mr-2">{link}</span>
      ))}
      {links.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-[#76b900] underline ml-2"
        >
          {expanded ? 'Show less' : `+${links.length - 3} more`}
        </button>
      )}
      {nonLinks.length > 0 && nonLinks}
    </div>
  );
};

export const getReactMarkDownCustomComponents = (handleClick = () => { console.log('didnt work')}) => {

  const source = getURLQueryParam({param: 'host'});
  const {
    state: { appConfig },
  } = useContext(HomeContext);

    return {
      citationlist: ({ children }) => {
        return <CitationList>{children}</CitationList>;
      },
        code({ node, inline, className, children, ...props }) {
        if (children.length) {
            if (children[0] == '▍') {
            return <span className="animate-pulse cursor-default mt-1">▍</span>
            }

            children[0] = (children[0] as string).replace("`▍`", "▍")
        }

        const match = /language-(\w+)/.exec(className || '');

        return !inline ? (
            <CodeBlock
              key={Math.random()}
              language={(match && match[1]) || ''}
              value={String(children).replace(/\n$/, '')}
              {...props}
            />
        ) : (
            <code className={className} {...props}>
            {children}
            </code>
        );
        },
        card: (cardInfo: { children: string[]; }) => {
          let payload = null
          try {
            payload = JSON.parse(cardInfo.children[0])
          }
          catch (error) {
            console.log(error)
          }
          return (
              <>
                {payload && <CardMessage payload={payload}/>}
              </>
          );
        },
        catalogcard: (catalogcardInfo: { children: string[]; }) => {
          let payload = null
          try {
            payload = JSON.parse(catalogcardInfo.children[0])
          }
          catch (error) {
            console.log(error)
          }
          return (
              <>
                {payload && <CatalogCardMessage payload={payload}/>}
              </>
          );
        },
        picker: (pickerInfo: { children: string[]; }) => {
          let payload = null
          try {
            payload = JSON.parse(pickerInfo.children[0])
          }
          catch (error) {
            console.log(error)
          }
          return (
              <>
                {payload && <Picker payload={payload} handleClick={handleClick}/>}
              </>
          );
        },
        chart: (chartInfo: { children: string[]; }) => {
          let payload = null
          try {
            payload = JSON.parse(chartInfo.children[0])
          }
          catch (error) {
            console.log(error)
          }
          return (
              <>
                {payload && <Chart 
                    payload={payload}
                  />}
              </>
          );
        },
        inputtext: (inputTextInfo: { children: string[]; }) => {
          let payload = null
          try {
            payload = JSON.parse(inputTextInfo.children[0])
          }
          catch (error) {
            console.log(error)
          }
          return (
              <>
                {payload && <InputText payload={payload} handleClick={handleClick}/>}
              </>
          );
        },
        table({ children }) {
        return (
            <table className="border-collapse border border-black px-3 py-1 dark:border-white">
            {children}
            </table>
        );
        },
        th({ children }) {
        return (
            <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
            {children}
            </th>
        );
        },
        td({ children }) {
        return (
            <td className="break-words border border-black px-3 py-1 dark:border-white">
            {children}
            </td>
        );
        },
        a: ({ href, children, title, ...props }) => {

          // this is a workaround to make the link open in the same tab for nvinfoapp - will revert this if this doesnt work
          const target = source === 'nvinfoapp-iOS' || source === 'nvinfoapp-Android' ? '_self' : '_blank';

          if (!appConfig.enableEmbedInlineImage){
            // prevent rendering embedInlineImage 
            if (String(children) == "embedInlineImage") {
              return (<></>)
            }
            return (    
              <a href={href} className={`text-[#76b900] no-underline hover:underline`} {...props} target={target} >
                  {children}
              </a>)
          } else {
            if (String(children) !== "embedInlineImage") {
              return (    
                <a href={href} className={`text-[#76b900] no-underline hover:underline`} {...props} target={target}>
                    {children}
                </a>)
            }
          }

          const onError = (event: { target: { src: string; }; }) => {
            console.error('error loading image', href);
            event.target.src = `/link/domain.png`;
          };
          return (
              <span className="relative group inline-flex items-center">
              <img
                src={href}
                alt="icon"
                className="w-4 h-4 mr-1 align-baseline mt-0 mb-0 inline-block"
                onError={onError}
              />
              {title && (
                <span
                className="absolute left-0 bottom-6 p-2 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity group-hover:animate-fadeout duration-300 whitespace-nowrap bg-lime-50 text-black dark:bg-[#363b35] dark:text-white shadow-md"
              >
                  {title}
                </span>
              )}
            </span>
          );
        },
        li: ({ children, ...props }) => (
          <li className="leading-[1.35rem] mb-1 list-disc" {...props}>
            {children}
          </li>
        ),
        p: ({ node, children, ...props }) => (
          <p style={{ marginBottom: '-0.5rem' }} {...props}>
            {children}
          </p>
        ),
        img: ({ src, alt, ...props }) => {
          // Check if src is a base64 encoded image
          const isBase64 = src?.includes('data:image');
        
          // Setting a default width and height can prevent layout shifts
          const defaultStyle = {
            maxWidth: '100%',
            maxHeight: 'auto',
          };
        
          // Modify additional styles if src is a base64 image
          const base64Style = isBase64 ? { width: '100%', height: 'auto' } : {};
        
          return (
            <img 
              src={src}
              alt={alt || 'image'}  // Provide an alt if not specified
              style={{ ...defaultStyle, ...base64Style }}
              {...props}
              className={`object-cover rounded-lg border border-slate-400 shadow-sm ${props.className || ''}`}
            />
          );
        }
  
    }
}
    