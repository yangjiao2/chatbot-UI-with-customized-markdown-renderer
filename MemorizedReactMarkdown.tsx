import { Typewriter } from '@/components/Plugins/Typewriter/Typewriter';
import { FC, memo } from 'react';
import { Options } from 'react-markdown';

// preventing unnecessary re-renders when its props haven’t changed.
export const MemoizedReactMarkdown: FC<Options> = memo(
    Typewriter,
    (prevProps, nextProps) => (
        prevProps.children === nextProps.children
    )
);
