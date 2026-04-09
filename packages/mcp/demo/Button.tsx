export function Button({ children }: { children: React.ReactNode }) {
  return (
    <button
      className="rounded-md px-[13px] py-[7px] bg-[#1a5276] text-[15px] text-white"
    >
      {children}
    </button>
  );
}
