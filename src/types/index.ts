export interface FormRow {
  sequence: number;
  item: string;
  barcode: string;
  quantity: string;
  packing: "حبة" | "كرتون" | "شد" | "";
  company: string;
  altCompany: string;
  notes: string;
}

export interface FormData {
  branchName: string;
  enteredBy: string;
  date: string;
  rows: FormRow[];
}

export interface DailyForm extends FormData {
  $id?: string;
  $createdAt?: string;
  $updatedAt?: string;
  userId?: string;
}

export interface User {
  $id: string;
  email: string;
  name: string;
}
