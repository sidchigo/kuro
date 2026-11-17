import { useRef, useImperativeHandle, forwardRef, type ChangeEvent } from 'react';

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

    return (
      <section className="p-6 bg-[#E62E25] text-[#0A0A0B] border-b border-[#262629] selection:bg-white selection:text-[#0A0A0B]">
        {/* Top Row: Title & Counter */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[11px] font-bold tracking-wider uppercase text-[#0A0A0B]">
            02 / WHAT STAYED WITH YOU
          </span>
          <span className="font-mono text-[11px] font-bold tracking-widest text-[#0A0A0B]">
            {sentence.length} / 140
          </span>
        </div>

        {/* Centerpiece: Borderless Auto-Resizing Instrument Serif Textarea with High-Contrast Selection */}
        <textarea
          ref={textareaRef}
          rows={2}
          maxLength={140}
          value={sentence}
          onChange={handleChange}
          placeholder="The unhurried dread of knowing something was watching through the camera..."
          className="w-full bg-transparent text-[#0A0A0B] placeholder:text-[#0A0A0B]/60 focus:outline-none resize-none font-serif text-[26px] leading-[1.2] py-2 border-0 outline-none selection:bg-white selection:text-[#0A0A0B]"
        />
      </section>
    );
  }
);

SentenceCanvas.displayName = 'SentenceCanvas';

export default SentenceCanvas;
