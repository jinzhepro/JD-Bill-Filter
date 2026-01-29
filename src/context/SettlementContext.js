"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from "react";
import { LogType } from "@/types";

const initialState = {
  uploadedFiles: [],
  originalData: [],
  processedData: [],
  isProcessing: false,
  logs: [],
  error: null,
  mergeMode: false,
  mergedData: [],
  fileDataArray: [],
  originalCount: 0,
  processedCount: 0,
  originalTotal: 0,
  processedTotal: 0,
  processingHistory: [],
  dataChanges: {},
  pasteHistory: [],
};

const ActionTypes = {
  SET_FILE: "SET_FILE",
  ADD_FILE: "ADD_FILE",
  REMOVE_FILE: "REMOVE_FILE",
  SET_ORIGINAL_DATA: "SET_ORIGINAL_DATA",
  SET_PROCESSED_DATA: "SET_PROCESSED_DATA",
  SET_PROCESSING: "SET_PROCESSING",
  ADD_LOG: "ADD_LOG",
  CLEAR_LOGS: "CLEAR_LOGS",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  RESET: "RESET",
  RESET_SETTLEMENT: "RESET_SETTLEMENT",
  SET_MERGE_MODE: "SET_MERGE_MODE",
  SET_MERGED_DATA: "SET_MERGED_DATA",
  SET_FILE_DATA_ARRAY: "SET_FILE_DATA_ARRAY",
  SET_ORIGINAL_COUNT: "SET_ORIGINAL_COUNT",
  SET_PROCESSED_COUNT: "SET_PROCESSED_COUNT",
  SET_ORIGINAL_TOTAL: "SET_ORIGINAL_TOTAL",
  SET_PROCESSED_TOTAL: "SET_PROCESSED_TOTAL",
  SET_PROCESSING_HISTORY: "SET_PROCESSING_HISTORY",
  SET_DATA_CHANGES: "SET_DATA_CHANGES",
  ADD_PROCESSING_HISTORY: "ADD_PROCESSING_HISTORY",
  ADD_DATA_CHANGE: "ADD_DATA_CHANGE",
  SET_PASTE_HISTORY: "SET_PASTE_HISTORY",
  ADD_PASTE_HISTORY: "ADD_PASTE_HISTORY",
  CLEAR_PASTE_HISTORY: "CLEAR_PASTE_HISTORY",
};

function settlementReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_FILE:
      return { ...state, uploadedFiles: [action.payload] };

    case ActionTypes.ADD_FILE:
      return {
        ...state,
        uploadedFiles: [...state.uploadedFiles, action.payload],
      };

    case ActionTypes.REMOVE_FILE:
      return {
        ...state,
        uploadedFiles: state.uploadedFiles.filter(
          (_, index) => index !== action.payload
        ),
      };

    case ActionTypes.SET_ORIGINAL_DATA:
      return { ...state, originalData: action.payload };

    case ActionTypes.SET_PROCESSED_DATA:
      return { ...state, processedData: action.payload };

    case ActionTypes.SET_PROCESSING:
      return { ...state, isProcessing: action.payload };

    case ActionTypes.ADD_LOG:
      return {
        ...state,
        logs: [
          ...state.logs,
          {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toLocaleTimeString(),
            message: action.payload.message,
            type: action.payload.type || LogType.INFO,
          },
        ],
      };

    case ActionTypes.CLEAR_LOGS:
      return { ...state, logs: [] };

    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };

    case ActionTypes.CLEAR_ERROR:
      return { ...state, error: null };

    case ActionTypes.SET_MERGE_MODE:
      return { ...state, mergeMode: action.payload };

    case ActionTypes.SET_MERGED_DATA:
      return { ...state, mergedData: action.payload };

    case ActionTypes.SET_FILE_DATA_ARRAY:
      return { ...state, fileDataArray: action.payload };

    case ActionTypes.SET_ORIGINAL_COUNT:
      return { ...state, originalCount: action.payload };

    case ActionTypes.SET_PROCESSED_COUNT:
      return { ...state, processedCount: action.payload };

    case ActionTypes.SET_ORIGINAL_TOTAL:
      return { ...state, originalTotal: action.payload };

    case ActionTypes.SET_PROCESSED_TOTAL:
      return { ...state, processedTotal: action.payload };

    case ActionTypes.SET_PROCESSING_HISTORY:
      return { ...state, processingHistory: action.payload };

    case ActionTypes.SET_DATA_CHANGES:
      return { ...state, dataChanges: action.payload };

    case ActionTypes.ADD_PROCESSING_HISTORY:
      return {
        ...state,
        processingHistory: [...state.processingHistory, action.payload],
      };

    case ActionTypes.ADD_DATA_CHANGE:
      return {
        ...state,
        dataChanges: {
          ...state.dataChanges,
          [action.payload.sku]: action.payload.changes,
        },
      };

    case ActionTypes.SET_PASTE_HISTORY:
      return { ...state, pasteHistory: action.payload };

    case ActionTypes.ADD_PASTE_HISTORY:
      const newHistory = [...state.pasteHistory, action.payload];
      if (typeof window !== "undefined") {
        localStorage.setItem("pasteHistory", JSON.stringify(newHistory));
      }
      return {
        ...state,
        pasteHistory: newHistory,
      };

    case ActionTypes.CLEAR_PASTE_HISTORY:
      if (typeof window !== "undefined") {
        localStorage.removeItem("pasteHistory");
      }
      return { ...state, pasteHistory: [] };

    case ActionTypes.RESET:
      return initialState;

    case ActionTypes.RESET_SETTLEMENT:
      return {
        ...state,
        uploadedFiles: [],
        originalData: [],
        processedData: [],
        isProcessing: false,
        mergeMode: false,
        mergedData: [],
        fileDataArray: [],
        originalCount: 0,
        processedCount: 0,
        originalTotal: 0,
        processedTotal: 0,
        processingHistory: [],
        dataChanges: {},
      };

    default:
      return state;
  }
}

const SettlementContext = createContext();

export function SettlementProvider({ children }) {
  const loadPasteHistoryFromStorage = () => {
    if (typeof window === "undefined") {
      return [];
    }
    try {
      const stored = localStorage.getItem("pasteHistory");
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error("Failed to load paste history from localStorage:", error);
      return [];
    }
  };

  const initialStateWithStorage = {
    ...initialState,
    pasteHistory: loadPasteHistoryFromStorage(),
  };

  const [state, dispatch] = useReducer(settlementReducer, initialStateWithStorage);

  const actions = {
    setFile: useCallback((file) => {
      dispatch({ type: ActionTypes.SET_FILE, payload: file });
    }, []),

    addFile: useCallback((file) => {
      dispatch({ type: ActionTypes.ADD_FILE, payload: file });
    }, []),

    removeFile: useCallback((index) => {
      dispatch({ type: ActionTypes.REMOVE_FILE, payload: index });
    }, []),

    setOriginalData: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_ORIGINAL_DATA, payload: data });
    }, []),

    setProcessedData: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_PROCESSED_DATA, payload: data });
    }, []),

    setProcessing: useCallback((isProcessing) => {
      dispatch({ type: ActionTypes.SET_PROCESSING, payload: isProcessing });
    }, []),

    addLog: useCallback((message, type = LogType.INFO) => {
      dispatch({ type: ActionTypes.ADD_LOG, payload: { message, type } });
    }, []),

    clearLogs: useCallback(() => {
      dispatch({ type: ActionTypes.CLEAR_LOGS });
    }, []),

    setError: useCallback((error) => {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error });
    }, []),

    clearError: useCallback(() => {
      dispatch({ type: ActionTypes.CLEAR_ERROR });
    }, []),

    setMergeMode: useCallback((mergeMode) => {
      dispatch({ type: ActionTypes.SET_MERGE_MODE, payload: mergeMode });
    }, []),

    setMergedData: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_MERGED_DATA, payload: data });
    }, []),

    setFileDataArray: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_FILE_DATA_ARRAY, payload: data });
    }, []),

    setOriginalCount: useCallback((count) => {
      dispatch({ type: ActionTypes.SET_ORIGINAL_COUNT, payload: count });
    }, []),

    setProcessedCount: useCallback((count) => {
      dispatch({ type: ActionTypes.SET_PROCESSED_COUNT, payload: count });
    }, []),

    setOriginalTotal: useCallback((total) => {
      dispatch({ type: ActionTypes.SET_ORIGINAL_TOTAL, payload: total });
    }, []),

    setProcessedTotal: useCallback((total) => {
      dispatch({ type: ActionTypes.SET_PROCESSED_TOTAL, payload: total });
    }, []),

    reset: useCallback(() => {
      dispatch({ type: ActionTypes.RESET });
    }, []),

    resetSettlement: useCallback(() => {
      dispatch({ type: ActionTypes.RESET_SETTLEMENT });
    }, []),

    setProcessingHistory: useCallback((history) => {
      dispatch({ type: ActionTypes.SET_PROCESSING_HISTORY, payload: history });
    }, []),

    setDataChanges: useCallback((changes) => {
      dispatch({ type: ActionTypes.SET_DATA_CHANGES, payload: changes });
    }, []),

    addProcessingHistory: useCallback((historyItem) => {
      dispatch({ type: ActionTypes.ADD_PROCESSING_HISTORY, payload: historyItem });
    }, []),

    addDataChange: useCallback((sku, changes) => {
      dispatch({ type: ActionTypes.ADD_DATA_CHANGE, payload: { sku, changes } });
    }, []),

    setPasteHistory: useCallback((history) => {
      dispatch({ type: ActionTypes.SET_PASTE_HISTORY, payload: history });
    }, []),

    addPasteHistory: useCallback((historyItem) => {
      dispatch({ type: ActionTypes.ADD_PASTE_HISTORY, payload: historyItem });
    }, []),

    clearPasteHistory: useCallback(() => {
      dispatch({ type: ActionTypes.CLEAR_PASTE_HISTORY });
    }, []),
  };

  const value = {
    ...state,
    ...actions,
  };

  return <SettlementContext.Provider value={value}>{children}</SettlementContext.Provider>;
}

export function useSettlement() {
  const context = useContext(SettlementContext);
  if (!context) {
    throw new Error("useSettlement must be used within a SettlementProvider");
  }
  return context;
}
