"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 使用 Web Worker 处理 Excel 数据的 Hook
 * 提供进度反馈和错误处理
 *
 * @returns {Object} worker API
 * @example
 * const { processData, isProcessing, progress } = useExcelWorker();
 * const result = await processData(data);
 */
export function useExcelWorker() {
  const workerRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, message: '' });
  const [error, setError] = useState(null);
  const taskIdRef = useRef(null);

  // 初始化 Worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/excelProcessor.worker.js', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e) => {
      const { type, progress: prog, error: err } = e.data;

      if (type === 'PROGRESS') {
        setProgress({ percent: prog.percent, message: prog.message });
      } else if (type === 'ERROR') {
        setIsProcessing(false);
        setError(err);
      }
    };

    workerRef.current.onerror = (err) => {
      setIsProcessing(false);
      setError(`Worker 错误: ${err.message}`);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  /**
   * 处理结算单数据
   * @param {Array} data - 原始数据
   * @returns {Promise<Array>} 处理后的数据
   */
  const processSettlementData = useCallback(async (data) => {
    setIsProcessing(true);
    setProgress({ percent: 0, message: '开始处理...' });
    setError(null);
    taskIdRef.current = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return new Promise((resolve, reject) => {
      const handleMessage = (e) => {
        const { type, result, error: err } = e.data;

        if (e.data.taskId !== taskIdRef.current) return;

        if (type === 'SUCCESS') {
          setIsProcessing(false);
          setProgress({ percent: 100, message: '处理完成' });
          workerRef.current.removeEventListener('message', handleMessage);
          resolve(result);
        } else if (type === 'ERROR') {
          setIsProcessing(false);
          workerRef.current.removeEventListener('message', handleMessage);
          reject(new Error(err));
        }
      };

      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.postMessage({
        type: 'PROCESS_SETTLEMENT',
        data,
        taskId: taskIdRef.current
      });
    });
  }, []);

  /**
   * 处理 CSV 数据
   * @param {string} csvText - CSV 文本
   * @returns {Promise<Array>} 解析后的数据
   */
  const processCSV = useCallback(async (csvText) => {
    setIsProcessing(true);
    setProgress({ percent: 0, message: '开始解析 CSV...' });
    setError(null);
    taskIdRef.current = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return new Promise((resolve, reject) => {
      const handleMessage = (e) => {
        const { type, result, error: err } = e.data;

        if (e.data.taskId !== taskIdRef.current) return;

        if (type === 'SUCCESS') {
          setIsProcessing(false);
          setProgress({ percent: 100, message: '解析完成' });
          workerRef.current.removeEventListener('message', handleMessage);
          resolve(result);
        } else if (type === 'ERROR') {
          setIsProcessing(false);
          workerRef.current.removeEventListener('message', handleMessage);
          reject(new Error(err));
        }
      };

      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.postMessage({
        type: 'PROCESS_CSV',
        data: csvText,
        taskId: taskIdRef.current
      });
    });
  }, []);

  /**
   * 取消当前处理
   */
  const cancel = useCallback(() => {
    if (workerRef.current && isProcessing) {
      workerRef.current.terminate();
      // 重新创建 Worker
      workerRef.current = new Worker(
        new URL('../workers/excelProcessor.worker.js', import.meta.url),
        { type: 'module' }
      );
      setIsProcessing(false);
      setProgress({ percent: 0, message: '' });
    }
  }, [isProcessing]);

  return {
    processSettlementData,
    processCSV,
    isProcessing,
    progress,
    error,
    cancel,
  };
}
