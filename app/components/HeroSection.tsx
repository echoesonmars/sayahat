import { TextAnimate } from "@/components/ui/text-animate";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"
import { BlurFade } from "@/components/ui/blur-fade"
import Link from "next/link"

export function HeroSec() {
  return (
    <>
    <section className="my-[13rem] sm:my-28 md:my-28 lg:my-40 px-2 sm:px-6">
      <div className="flex flex-col items-center justify-center mt-10 sm:mt-12 md:mt-16 lg:mt-28 text-center">
        <h1 className="font-tapestry tracking-[-0.07em] text-[7rem] sm:text-8xl md:text-[14rem] lg:text-[12rem] xl:text-[14rem]">
          <span style={{ color: '#00D592' }}>
            <TextAnimate animation="slideUp" by="character" className="inline" delay={0.2}>
              saya
            </TextAnimate>
          </span>
          <span style={{ color: '#006948' }}>
            <TextAnimate animation="slideUp" by="character" className="inline" delay={0.6}>
              hat
            </TextAnimate>
          </span>
        </h1>
      </div>

      <div className='max-w-xl lg:max-w-2xl mx-auto px-5'>
        <h1 className="text-2xl sm:text-2xl md:text-2xl lg:text-3xl mt-3 sm:mt-2 md:mt-6 lg:mt-8 tracking-[-0.07em]">
          <TextAnimate animation="slideUp" by="word" className="inline" delay={2}>
            Планируй маршрут, бронируй жильё, исследуй страну и оставайся в безопасности
          </TextAnimate>
        </h1>
        <h1 className="text-[#575757] mt-5 text-xl sm:text-xl md:text-2xl lg:text-3xl tracking-[-0.07em]">
          <TextAnimate animation="slideUp" by="word" className="inline" delay={3}>
            — всё в одном сервисе.
          </TextAnimate>
        </h1>
      </div>

      <div className="mb-25 max-w-2xl mt-6 sm:mt-9 md:mt-6 lg:mt-6 mb-25 mx-auto flex justify-left px-4">
        <BlurFade delay={4} inView>
          <div className="w-full sm:w-auto">
            <Link href="/ai-guide">
              <InteractiveHoverButton className="w-full sm:w-auto ">
                Начать путешествие
              </InteractiveHoverButton>
            </Link>
          </div>
        </BlurFade>
      </div>
    </section>
    </>
  );
}