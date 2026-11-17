import { useRef, useImperativeHandle, forwardRef, type ChangeEvent } from 'react';

const STARTER_PILLS = [
  '+ The creeping isolation of...',
  '+ Zero jump scares, just...',
  '+ The way it used...',
];

export interface SentenceCanvasHandle {
  adjustHeight: () => void;
  focus: () => void;
}

interface SentenceCanvasProps {
  sentence: string;
  onSentenceChange: (text: string) => void;
}

const SentenceCanvas = forwardRef<SentenceCanvasHandle, SentenceCanvasProps>(
  ({ sentence, onSentenceChange }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    };

    useImperativeHandle(ref, () => ({
      adjustHeight,
      focus: () => {
        textareaRef.current?.focus();
      },
    }));

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      onSentenceChange(e.target.value);
      adjustHeight();
    };

    const handleStarterPillClick = (pillText: string) => {
      const cleanText = pillText.replace(/^\+\s*/, '');
      const newSentence = sentence ? `${sentence} ${cleanText}`.slice(0, 140) : cleanText;
      onSentenceChange(newSentence);
      if (textareaRef.current) {
        textareaRef.current.focus();
        setTimeout(adjustHeight, 10);
      }
    };

    return (
      <section className="p-6 bg-[#0E0E10] text-[#F2EFE9] border-b border-[#262629] selection:bg-[#E62E25] selection:text-[#F2EFE9]">
        {/* Top Row: Title & Counter */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] tracking-widest text-[#8A8882] uppercase">
            02 / WHAT STAYED WITH YOU
          </span>
          <span className="font-mono text-[10px] text-[#8A8882] tracking-widest">
            {sentence.length} / 140
          </span>
        </div>

        {/* Centerpiece: Borderless Auto-Resizing 24px Instrument Serif Textarea */}
        <textarea
          ref={textareaRef}
          rows={2}
          maxLength={140}
          value={sentence}
          onChange={handleChange}
          placeholder="The unhurried dread of knowing something was watching through the camera..."
          className="w-full bg-transparent text-[#F2EFE9] placeholder:text-[#8A8882]/40 focus:outline-none resize-none font-serif text-[24px] leading-[1.25] py-2 border-0 outline-none selection:bg-[#E62E25] selection:text-white"
        />

        {/* Bottom Row: Starter Suggestions */}
        <div className="flex flex-col gap-1.5 mt-3 pt-3 border-t border-[#262629]">
          {STARTER_PILLS.map((pill, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleStarterPillClick(pill)}
              className="font-mono text-[10px] border border-[#262629] px-2.5 py-1 text-left text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#E62E25] hover:bg-[#121214] transition-colors leading-tight"
            >
              {pill}
            </button>
          ))}
        </div>
      </section>
    );
  }
);

SentenceCanvas.displayName = 'SentenceCanvas';

export default SentenceCanvas;
