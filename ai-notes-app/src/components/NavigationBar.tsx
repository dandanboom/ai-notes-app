"use client";

import React from "react";
import { ChevronLeft, MoreHorizontal, Signal, Wifi, Battery } from "lucide-react";
import { GlassButton } from "./GlassButton";

export default function NavigationBar() {
  return (
    <div className="w-full flex flex-col pointer-events-none">
      {/* Mock Status Bar - iOS Style */}
      <div className="h-[44px] flex justify-between items-center px-6 text-black/80 text-[15px] font-semibold">
        <span>9:41</span>
        <div className="flex gap-2 text-black">
          <Signal size={16} />
          <Wifi size={16} />
          <Battery size={20} />
        </div>
      </div>

      {/* Nav Content - Glass Buttons */}
      <div className="h-[50px] flex justify-between px-4 items-center pointer-events-auto">
        <GlassButton icon={ChevronLeft} />
        <GlassButton icon={MoreHorizontal} />
      </div>
    </div>
  );
}








