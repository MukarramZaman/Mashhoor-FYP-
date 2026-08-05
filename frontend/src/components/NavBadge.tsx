type NavBadgeProps = {
  count: number;
  className?: string;
};

function NavBadge({ count, className = "" }: NavBadgeProps) {
  if (count <= 0) return null;
  return (
    <span
      className={`bg-red-500 text-white rounded-full min-w-[1.25rem] h-5 px-1.5 text-xs font-bold flex items-center justify-center ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default NavBadge;
