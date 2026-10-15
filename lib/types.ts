export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number | null;
  image_url: string | null;
  sizes: string[];
  flavors: string[];
  active: boolean;
};
export type Creation = {
  id: string;
  title: string;
  description: string;
  video_url: string | null;
  image_url: string | null;
  active: boolean;
  sort_order: number;
};
export type Option = {
  id: string;
  kind: string;
  label: string;
  price: number | null;
  portions: number | null;
  active: boolean;
};
export type Settings = {
  id: string;
  intro: string;
  about: string;
  delivery: boolean;
  max_fillings: number;
  sections: Record<string, boolean>;
};
export const defaultSettings: Settings = {
  id: "main",
  intro: "No Bolos da Mi, em Botucatu, fazemos bolos e doces artesanais sob encomenda para a sua comemoração.",
  about: "No Bolos da Mi, em Botucatu, fazemos bolos e doces artesanais sob encomenda para a sua comemoração.\n\nEscolha suas opções no site e converse com a Mi pelo WhatsApp para combinar sabores, tamanho e decoração. Do bentô cake ao bolo temático ou vintage, cada encomenda é preparada especialmente para você.\n\nConfira nossas criações no Instagram e consulte a disponibilidade para a data desejada. Sua encomenda será confirmada no atendimento com a Mi.",
  delivery: false,
  max_fillings: 1,
  sections: {},
};
export type Data = {
  products: Product[];
  creations: Creation[];
  options: Option[];
  settings: Settings;
  logoVideo: boolean;
  staticLogo: boolean;
};
export type CartItem = {
  id: string;
  name: string;
  quantity: number;
  price: number | null;
  detail: string;
};
export type Cake = {
  occasion: string;
  size: string;
  batter: string;
  fillings: string[];
  extras: string[];
  style: string;
  colors: string;
  theme: string;
  message: string;
  reference: string;
  date: string;
  time: string;
  method: string;
  address: string;
  notes: string;
  image: string;
};
export const emptyCake: Cake = {
  occasion: "",
  size: "",
  batter: "",
  fillings: [],
  extras: [],
  style: "",
  colors: "",
  theme: "",
  message: "",
  reference: "",
  date: "",
  time: "",
  method: "Retirada",
  address: "",
  notes: "",
  image: "",
};
