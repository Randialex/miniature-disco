const archives = [
  {
    id: "book",
    eyebrow: "LIBRIS · I",
    title: "书录区",
    description: "收藏读过的世界、留痕的句子，以及那些合卷后仍未熄灭的回声。",
    status: "藏蓝卷宗 · 待启",
    className: "magic-card--book",
  },
  {
    id: "film",
    eyebrow: "IMAGO · II",
    title: "影像区",
    description: "封存银幕与荧屏里的光影，在暗紫帷幕之后重访每一场梦境。",
    status: "暗紫卷宗 · 待启",
    className: "magic-card--film",
  },
  {
    id: "cp",
    eyebrow: "VINCULUM · III",
    title: "羁绊区",
    description: "记录人物之间隐秘而恒久的引力，追溯故事中最动人的相逢。",
    status: "墨绿卷宗 · 待启",
    className: "magic-card--cp",
  },
];

export default function Home() {
  return (
    <div id="top" className="home-page">
      <section className="hero" aria-labelledby="hero-title">
        <p className="hero__kicker"><span aria-hidden="true">✦</span> ADMITTANCE BY INVITATION <span aria-hidden="true">✦</span></p>
        <div className="hero__crest" aria-hidden="true">
          <span>SR</span>
        </div>
        <p className="hero__owner">拾染randi&apos;s collection</p>
        <h1 id="hero-title">书影私藏魔法录</h1>
        <p className="hero__subtitle">书页有咒，光影成诗，羁绊自有回响。</p>
        <div className="gothic-divider" aria-hidden="true"><span>◆</span></div>
        <p className="hero__intro">
          一座为故事而留的私人档案馆。三重卷宗将在此陆续苏醒，
          所有阅读、观看与心动的时刻，终将沿同一条时间长廊彼此照见。
        </p>
        <a className="magic-btn" href="#archives">步入档案馆</a>
      </section>

      <section id="archives" className="archive-section" aria-labelledby="archive-title">
        <div className="section-heading">
          <p>THE THREE ARCHIVES</p>
          <h2 id="archive-title">三重私藏卷宗</h2>
        </div>
        <div className="archive-grid">
          {archives.map((archive, index) => (
            <article id={archive.id} className={`magic-card ${archive.className}`} key={archive.id}>
              <div className="magic-card__index" aria-hidden="true">0{index + 1}</div>
              <p className="magic-card__eyebrow">{archive.eyebrow}</p>
              <h3>{archive.title}</h3>
              <div className="magic-card__rule" aria-hidden="true" />
              <p>{archive.description}</p>
              <span className="magic-card__status">{archive.status}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="parchment-box" aria-labelledby="letter-title">
        <span className="parchment-box__mark" aria-hidden="true">R</span>
        <p className="parchment-box__eyebrow">A LETTER FROM THE ARCHIVIST</p>
        <h2 id="letter-title">致故事的来访者</h2>
        <p>
          此处尚在点亮第一盏烛火。书录、影像与羁绊将依次归档，
          由星级评定、时间印记与彼此相连的秘径，织成一册只属于拾染randi的魔法录。
        </p>
        <p className="parchment-box__signature">— 拾染randi</p>
      </section>
    </div>
  );
}
