"use client";

import { useState, useEffect, useRef } from "react";

/**
 * 流式数据加载 Hook
 * 用于模拟流式数据加载效果
 *
 * @param {Object} options
 * @param {number} options.chunkSize - 每次加载的数据量
 * @param {number} options.delay - 每次加载的延迟(ms)
 * @returns {Object} 流式加载 API
 */
export function useStreaming(options = {}) {
  const { chunkSize = 100, delay = 50 } = options;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef(false);

  const startStreaming = async (fullData) => {
    if (!fullData || fullData.length === 0) return [];

    abortRef.current = false;
    setLoading(true);
    setProgress(0);
    setData([]);

    const result = [];
    const total = fullData.length;
    let index = 0;

    try {
      while (index < total && !abortRef.current) {
        // 加载一批数据
        const chunk = fullData.slice(index, index + chunkSize);
        result.push(...chunk);
        index += chunkSize;

        // 更新状态
        setData([...result]);
        setProgress(Math.round((index / total) * 100));

        // 延迟
        if (index < total) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      setProgress(100);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    abortRef.current = true;
    setLoading(false);
  };

  const reset = () => {
    setData([]);
    setProgress(0);
    setLoading(false);
    abortRef.current = false;
  };

  return {
    data,
    loading,
    progress,
    startStreaming,
    cancel,
    reset,
  };
}

/**
 * 打字机效果 Hook
 *
 * @param {string} text - 要显示的文本
 * @param {number} speed - 打字速度(ms)
 * @returns {string} 当前显示的文本
 */
export function useTypewriter(text, speed = 30) {
  const [displayText, setDisplayText] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!text) {
      setDisplayText("");
      return;
    }

    setStarted(true);
    setDisplayText("");
    let index = 0;

    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return displayText;
}
