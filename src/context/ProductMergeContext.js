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
  RESET_PRODUCT_MERGE: "RESET_PRODUCT_MERGE",
  SET_MERGE_MODE: "SET_MERGE_MODE",
  SET_MERGED_DATA: "SET_MERGED_DATA",
  SET_FILE_DATA_ARRAY: "SET_FILE_DATA_ARRAY",
  SET_ORIGINAL_COUNT: "SET_ORIGINAL_COUNT",
  SET_PROCESSED_COUNT: "SET_PROCESSED_COUNT",
};

function productMergeReducer(state, action) {
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

    case ActionTypes.RESET:
      return initialState;

    case ActionTypes.RESET_PRODUCT_MERGE:
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
      };

    default:
      return state;
  }
}

const ProductMergeContext = createContext();

export function ProductMergeProvider({ children }) {
  const [state, dispatch] = useReducer(productMergeReducer, initialState);

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

    reset: useCallback(() => {
      dispatch({ type: ActionTypes.RESET });
    }, []),

    resetProductMerge: useCallback(() => {
      dispatch({ type: ActionTypes.RESET_PRODUCT_MERGE });
    }, []),
  };

  const value = {
    ...state,
    ...actions,
  };

  return <ProductMergeContext.Provider value={value}>{children}</ProductMergeContext.Provider>;
}

export function useProductMerge() {
  const context = useContext(ProductMergeContext);
  if (!context) {
    throw new Error("useProductMerge must be used within a ProductMergeProvider");
  }
  return context;
}
