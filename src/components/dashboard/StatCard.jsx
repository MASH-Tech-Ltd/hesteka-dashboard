import React from "react";

const StatCard = React.memo(({ label, value, sub, subType = "up", sub2, subType2 = "up", loading = false, color = "bg-[#8B6914]" }) => {
  const subColors = {
    up: "text-green-600",
    down: "text-red-600",
    wait: "text-orange-500",
    neutral: "text-[#9a8a7a]",
  };

  const subIcons = {
    up: "▲",
    down: "▼",
    wait: "⏳",
    neutral: "▶",
  };

  const containerClasses = "bg-white rounded-xl p-3 px-4 border border-[#e8ddd0] flex flex-col justify-between min-h-[85px] w-full transition-all hover:shadow-md relative overflow-hidden";

  if (loading || value.text === "...") {
    return (
      <div className={`${containerClasses} animate-pulse`}>
        <div>
          <div className="h-2 bg-gray-100 rounded w-1/2 mb-1.5"></div>
          <div className="h-6 bg-gray-100 rounded w-3/4"></div>
        </div>
        <div className="h-2 bg-gray-50 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <div className={`absolute left-0 top-0 w-1 h-full ${color}`}></div>
      <div>
        <p className="text-[10px] font-black tracking-widest text-[#9a8a7a] uppercase mb-0.5">
          {label}
        </p>
        <p className={`text-2xl font-black leading-none ${value.color}`}>
          {value.text}
        </p>
      </div>
      <div className="mt-auto space-y-1">
        {sub ? (
          <p className={`text-[10px] flex items-center gap-1 ${subColors[subType]}`}>
            <span>{subIcons[subType]}</span>
            {sub}
          </p>
        ) : (
          <p className="text-[10px] invisible leading-none">&nbsp;</p>
        )}
        {sub2 && (
          <p className={`text-[10px] flex items-center gap-1 ${subColors[subType2]}`}>
            <span>{subIcons[subType2]}</span>
            {sub2}
          </p>
        )}
      </div>
    </div>
  );
});

export default StatCard;
