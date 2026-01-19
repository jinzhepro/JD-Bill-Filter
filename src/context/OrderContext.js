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
  skuProcessedData: [],
  isSkuProcessing: false,
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
  RESET_ORDER: "RESET_ORDER",
  SET_MERGE_MODE: "SET_MERGE_MODE",
  SET_MERGED_DATA: "SET_MERGED_DATA",
  SET_FILE_DATA_ARRAY: "SET_FILE_DATA_ARRAY",
  SET_SKU_PROCESSED_DATA: "SET_SKU_PROCESSED_DATA",
  SET_SKU_PROCESSING: "SET_SKU_PROCESSING",
};

function orderReducer(state, action) {
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

    case ActionTypes.SET_SKU_PROCESSED_DATA:
      return { ...state, skuProcessedData: action.payload };

    case ActionTypes.SET_SKU_PROCESSING:
      return { ...state, isSkuProcessing: action.payload };

    case ActionTypes.RESET:
      return initialState;

    case ActionTypes.RESET_ORDER:
      return {
        ...state,
        uploadedFiles: [],
        originalData: [],
        processedData: [],
        isProcessing: false,
        mergeMode: false,
        mergedData: [],
        fileDataArray: [],
        skuProcessedData: [],
        isSkuProcessing: false,
      };

    default:
      return state;
  }
}

const OrderContext = createContext();

export function OrderProvider({ children }) {
  const [state, dispatch] = useReducer(orderReducer, initialState);

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

    setSkuProcessedData: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_SKU_PROCESSED_DATA, payload: data });
    }, []),

    setSkuProcessing: useCallback((isProcessing) => {
      dispatch({ type: ActionTypes.SET_SKU_PROCESSING, payload: isProcessing });
    }, []),

    reset: useCallback(() => {
      dispatch({ type: ActionTypes.RESET });
    }, []),

    resetOrder: useCallback(() => {
      dispatch({ type: ActionTypes.RESET_ORDER });
    }, []),
  };

  const value = {
    ...state,
    ...actions,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrder must be used within an OrderProvider");
  }
  return context;
}
