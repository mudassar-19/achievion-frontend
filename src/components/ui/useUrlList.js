import { useSearchParams } from "react-router-dom";

// ?param=a,b → ["a","b"] (pairs with FilterChips).
export default function useUrlList(param) {
  const [sp] = useSearchParams();
  return (sp.get(param) ?? "").split(",").filter(Boolean);
}
