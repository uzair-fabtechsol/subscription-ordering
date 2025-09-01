export interface IResponseObject {
  status: "success" | "fail";
  message: string;
  data?: any;
}
