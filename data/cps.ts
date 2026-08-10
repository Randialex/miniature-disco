import type { Cp } from "@/types";

export const cps: Cp[] = [
  {
    id: "prince-and-rose",
    name: "小王子 × 玫瑰",
    origin: "《小王子》",
    startDate: "2026-07-18",
    rating: 5,
    tone: "#285d4a",
    monogram: "玫",
    summary: "他们并不因为完美而独一无二，而是因为驯服、等待与付出的时间。离开使小王子理解爱，归途则让责任成为比浪漫更长久的承诺。",
    scenes: [
      { title: "玻璃罩下", note: "她用骄傲藏起脆弱，他还不懂那些话背后的请求。", motif: "✿" },
      { title: "狐狸的秘密", note: "在告别之后，他终于明白那朵玫瑰为何与万千玫瑰不同。", motif: "◇" },
      { title: "回望 B612", note: "漫天星辰从此都藏着一朵需要被照料的花。", motif: "✦" },
    ],
    bookIds: ["the-little-prince"],
    filmIds: ["the-little-prince-2015"],
  },
  {
    id: "jane-and-rochester",
    name: "简·爱 × 罗切斯特",
    origin: "《简·爱》",
    startDate: "2026-05-04",
    rating: 4.5,
    tone: "#234f3f",
    monogram: "J·R",
    summary: "最动人的并非庄园主与家庭教师的浪漫，而是简始终拒绝以自我消失换取爱情。分离烧尽权力的不平等，重逢才真正成为两个完整灵魂的选择。",
    scenes: [
      { title: "桑菲尔德初遇", note: "雾中落马的陌生人，揭开一座旧宅最漫长的秘密。", motif: "♞" },
      { title: "栗树之夜", note: "雷劈开的树预示裂痕，却没有否定两颗灵魂的靠近。", motif: "♢" },
      { title: "荒原归来", note: "在离开与成长之后，他们终于站在同样的高度。", motif: "❦" },
    ],
    bookIds: ["jane-eyre"],
    filmIds: ["jane-eyre-2011"],
  },
  {
    id: "sebastian-and-ciel",
    name: "塞巴斯蒂安 × 夏尔",
    origin: "《黑执事》",
    startDate: "2025-10-31",
    rating: 4,
    tone: "#1c4938",
    monogram: "契",
    summary: "以灵魂为终点的契约，把忠诚与危险锁在同一条银链上。主从秩序表面严谨，内里却始终流动着试探、控制与共同走向结局的默契。",
    scenes: [
      { title: "契约印记", note: "一个命令与一个回应，确定了此后所有华丽而危险的秩序。", motif: "♙" },
      { title: "银器与红茶", note: "最日常的仪式，恰好掩盖最非人的真相。", motif: "♜" },
      { title: "棋局未终", note: "少年把复仇当作棋盘，而执事永远站在一步之外。", motif: "♛" },
    ],
  },
  {
    id: "howl-and-sophie",
    name: "哈尔 × 苏菲",
    origin: "《哈尔的移动城堡》",
    startDate: "2025-07-12",
    rating: 5,
    tone: "#2b6048",
    monogram: "心",
    summary: "一个害怕承担、一个习惯否定自己，他们在移动城堡的混乱日常里互相拆除诅咒。爱不是拯救某一方，而是终于愿意带着真实的自己回家。",
    scenes: [
      { title: "空中漫步", note: "城市屋顶之上，命运第一次轻盈地转弯。", motif: "✧" },
      { title: "寻找心脏", note: "穿过战火与过去，把失落的心亲手送回。", motif: "♡" },
      { title: "新的城堡", note: "废墟重新长出门窗，也长出一个可以共同生活的家。", motif: "⌂" },
    ],
  },
];

export const getCp = (id: string) => cps.find((cp) => cp.id === id);
