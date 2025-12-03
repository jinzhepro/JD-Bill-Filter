import React from "react";

const Button = React.memo(function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  onClick,
  type = "button",
  ...props
}) {
  const buttonVariants = {
    primary:
      "bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:from-primary-600 hover:to-secondary-600 transform hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-xl",
    secondary:
      "bg-gray-100 text-gray-700 hover:bg-gray-200 transform hover:-translate-y-0.5 transition-all duration-200",
    success:
      "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-xl",
    danger:
      "bg-red-500 text-white hover:bg-red-600 transform hover:-translate-y-0.5 transition-all duration-200",
    warning:
      "bg-yellow-500 text-white hover:bg-yellow-600 transform hover:-translate-y-0.5 transition-all duration-200",
    info: "bg-blue-500 text-white hover:bg-blue-600 transform hover:-translate-y-0.5 transition-all duration-200",
  };

  const buttonSizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
    xl: "px-8 py-4 text-xl",
  };

  const baseClasses =
    "inline-flex items-center justify-center font-medium rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500";
  const disabledClasses = disabled
    ? "opacity-50 cursor-not-allowed transform-none"
    : "";

  const classes = `
    ${baseClasses}
    ${buttonVariants[variant]}
    ${buttonSizes[size]}
    ${disabledClasses}
    ${className}
  `
    .trim()
    .replace(/\s+/g, " ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

export default Button;
