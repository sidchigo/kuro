<script lang="ts">
  interface Props {
    sentence: string;
    onSentenceChange: (text: string) => void;
  }

  let { sentence, onSentenceChange }: Props = $props();

  let textareaEl: HTMLTextAreaElement | undefined = $state();

  export function adjustHeight() {
    if (textareaEl) {
      textareaEl.style.height = 'auto';
      textareaEl.style.height = `${textareaEl.scrollHeight}px`;
    }
  }

  export function focus() {
    textareaEl?.focus();
  }

  function handleInput(e: Event) {
    const target = e.currentTarget as HTMLTextAreaElement;
    onSentenceChange(target.value);
    adjustHeight();
  }
</script>

<section
  class="sentence-canvas-section p-6 bg-accent text-[#0A0A0B] border-b border-[#262629] selection:bg-white selection:text-black"
  style="background-color: var(--accent);"
>
  <!-- Top Row: Title & Counter -->
  <div class="flex items-center justify-between mb-2">
    <span class="font-mono text-[11px] font-bold tracking-wider uppercase text-[#0A0A0B]">
      02 / WHAT STAYED WITH YOU
    </span>
    <span class="font-mono text-[11px] font-bold tracking-widest text-[#0A0A0B]">
      {sentence.length} / 140
    </span>
  </div>

  <!-- Centerpiece: Borderless Auto-Resizing Instrument Serif Textarea with High-Contrast White Selection -->
  <textarea
    bind:this={textareaEl}
    rows={2}
    maxlength={140}
    value={sentence}
    oninput={handleInput}
    placeholder="The unhurried dread of knowing something was watching through the camera..."
    class="sentence-canvas-textarea w-full bg-transparent text-[#0A0A0B] placeholder:text-[#0A0A0B]/60 focus:outline-none resize-none font-serif text-[26px] leading-[1.2] py-2 border-0 outline-none selection:bg-white selection:text-black"
  ></textarea>
</section>

<style>
  .sentence-canvas-textarea::selection,
  .sentence-canvas-textarea::-moz-selection,
  .sentence-canvas-section :global(::selection),
  .sentence-canvas-section textarea::selection,
  .sentence-canvas-section::-moz-selection {
    background-color: #ffffff !important;
    color: #000000 !important;
    -webkit-text-fill-color: #000000 !important;
  }
</style>
