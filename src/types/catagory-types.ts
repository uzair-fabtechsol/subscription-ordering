export interface ICategory extends Document {
  name: string;
  description?: string;
  image?: string;
  status: "active" | "inactive";
}
