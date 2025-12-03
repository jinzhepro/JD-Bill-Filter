import React from "react";

export default function ProgressBar({
  progress = 0,
  text,
  showPercentage = true,
  size = "md",
  color = "primary",
  className = "",
}) {
  const sizeClasses = {
    sm: "h-2",
    md: "h-4",
    lg: "h-6",
  };

  const colorClasses = {
    primary: "bg-gradient-to-r from-primary-500 to-secondary-500",
    success: "bg-gradient-to-r from-green-500 to-green-600",
    warning: "bg-gradient-to-r from-yellow-500 to-yellow-600",
    danger: "bg-gradient-to-r from-red-500 to-red-600",
  };

  return (
    <div className={`w-full ${className}`}>
      {text && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{text}</span>
          {showPercentage && (
            <span className="text-sm font-medium text-gray-500">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}
      <div
        className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}
      >
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-300 ease-out rounded-full`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

// 简单的进度条组件
export function SimpleProgressBar({ progress = 0, className = "" }) {
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div
        className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}

// 步骤进度条组件
export function StepProgressBar({
  steps = [],
  currentStep = 0,
  className = "",
}) {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200
                    ${isCompleted ? "bg-green-500 text-white" : ""}
                    ${
                      isActive
                        ? "bg-primary-500 text-white ring-4 ring-primary-100"
                        : ""
                    }
                    ${
                      !isActive && !isCompleted
                        ? "bg-gray-200 text-gray-500"
                        : ""
                    }
                  `}
                >
                  {isCompleted ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isActive
                      ? "text-primary-600"
                      : isCompleted
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    index < currentStep ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
