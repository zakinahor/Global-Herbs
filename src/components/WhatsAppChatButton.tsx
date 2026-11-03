import React from 'react';

export default function WhatsAppChatButton() {
  const phoneNumber = '14195085198';
  const message = 'Hello Global Herbs! I visited your website and would like to make an inquiry. Could you please assist me?';
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 flex items-center group">
      {/* Desktop Tooltip */}
      <div
        role="tooltip"
        className="hidden md:flex items-center gap-2 mr-3 px-3.5 py-1.5 bg-gray-900/95 text-white text-xs font-bold rounded-xl shadow-xl opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap border border-gray-800/80"
      >
        <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
        <span>Chat with us</span>
        <div className="w-1.5 h-1.5 bg-gray-900 rotate-45 absolute -right-0.5 top-1/2 -translate-y-1/2 border-r border-t border-gray-800" />
      </div>

      {/* Floating Action Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Global Herbs on WhatsApp (+1 419-508-5198)"
        title="Chat with Global Herbs on WhatsApp"
        className="relative flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#25D366] text-white shadow-[0_4px_18px_rgba(37,211,102,0.4)] hover:shadow-[0_6px_26px_rgba(37,211,102,0.6)] hover:bg-[#22bf5b] hover:scale-108 active:scale-95 transition-all duration-300 ease-out focus:outline-none focus:ring-3 focus:ring-[#25D366]/50 focus:ring-offset-2"
      >
        {/* Subtle Ping Wave Effect */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 animate-ping -z-10" />

        {/* Official WhatsApp White Icon */}
        <svg
          viewBox="0 0 24 24"
          width="30"
          height="30"
          fill="currentColor"
          className="w-7 h-7 sm:w-7.5 sm:h-7.5 transition-transform duration-300 group-hover:rotate-6 drop-shadow-xs"
          aria-hidden="true"
        >
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.59 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM8.84 6.75C8.65 6.75 8.35 6.82 8.1 7.09C7.85 7.36 7.15 8.01 7.15 9.35C7.15 10.69 8.13 11.98 8.26 12.16C8.4 12.35 10.19 15.11 12.93 16.29C13.58 16.57 14.09 16.74 14.49 16.87C15.14 17.07 15.74 17.05 16.21 16.98C16.73 16.9 17.81 16.32 18.04 15.68C18.27 15.04 18.27 14.49 18.2 14.37C18.13 14.26 17.94 14.2 17.66 14.06C17.37 13.92 16.02 13.25 15.77 13.16C15.52 13.07 15.34 13.02 15.15 13.31C14.97 13.6 14.45 14.2 14.29 14.39C14.13 14.57 13.98 14.6 13.69 14.46C13.41 14.32 12.51 14.02 11.45 13.08C10.62 12.34 10.06 11.43 9.9 11.16C9.74 10.88 9.88 10.73 10.02 10.59C10.15 10.46 10.31 10.25 10.45 10.08C10.6 9.91 10.65 9.79 10.74 9.61C10.83 9.42 10.79 9.26 10.72 9.12C10.65 8.98 10.09 7.61 9.86 7.05C9.64 6.51 9.41 6.58 9.24 6.57L8.84 6.75Z" />
        </svg>

        {/* Live Status Badge */}
        <span
          className="absolute top-0 right-0 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow-xs"
          aria-hidden="true"
        >
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
        </span>
      </a>
    </div>
  );
}
