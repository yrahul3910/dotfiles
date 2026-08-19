export interface Violation {
  file: string;
  line: number;
  col: number;
  rule: string;
  message: string;
}
