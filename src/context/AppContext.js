"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";
import { LogType } from "@/types";
import { getInventoryFromDatabase } from "@/lib/inventoryStorage";

// 初始状态
const initialState = {
  uploadedFiles: [], // 改为数组，支持多个文件
  originalData: [],
  processedData: [],
  isProcessing: false,
  logs: [],
  error: null,
  mergeMode: false, // 新增：是否处于合并模式
  mergedData: [], // 新增：合并后的数据
  fileDataArray: [], // 新增：存储多个文件的数据数组
  // 库存管理相关状态
  inventoryMode: false, // 是否处于库存管理模式
  inventoryItems: [], // 库存物品列表
  inventoryForm: {
    // 库存表单数据
    materialName: "",
    quantity: "",
    purchaseBatch: "",
    sku: "",
    unitPrice: "", // 单价
    totalPrice: "", // 总价
    taxRate: "13", // 税率，默认13%
    taxAmount: "", // 税额
    warehouse: "", // 仓库
  },
  editingInventoryId: null, // 正在编辑的库存项ID
  // SKU和批次号处理相关状态
  skuProcessedData: [], // 经过SKU替换和批次号添加的数据
  isSkuProcessing: false, // 是否正在进行SKU处理
  // MySQL数据库相关状态
  isDbLoading: false, // 是否正在从数据库加载数据
};

// Action 类型
const ActionTypes = {
  SET_FILE: "SET_FILE",
  ADD_FILE: "ADD_FILE", // 新增：添加文件到列表
  REMOVE_FILE: "REMOVE_FILE", // 新增：从列表中移除文件
  SET_ORIGINAL_DATA: "SET_ORIGINAL_DATA",
  SET_PROCESSED_DATA: "SET_PROCESSED_DATA",
  SET_PROCESSING: "SET_PROCESSING",
  ADD_LOG: "ADD_LOG",
  CLEAR_LOGS: "CLEAR_LOGS",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  RESET: "RESET",
  SET_MERGE_MODE: "SET_MERGE_MODE", // 新增：设置合并模式
  SET_MERGED_DATA: "SET_MERGED_DATA", // 新增：设置合并后的数据
  SET_FILE_DATA_ARRAY: "SET_FILE_DATA_ARRAY", // 新增：设置文件数据数组
  // 库存管理相关Action类型
  SET_INVENTORY_MODE: "SET_INVENTORY_MODE",
  SET_INVENTORY_ITEMS: "SET_INVENTORY_ITEMS",
  ADD_INVENTORY_ITEM: "ADD_INVENTORY_ITEM",
  ADD_MULTIPLE_INVENTORY_ITEMS: "ADD_MULTIPLE_INVENTORY_ITEMS",
  UPDATE_INVENTORY_ITEM: "UPDATE_INVENTORY_ITEM",
  DELETE_INVENTORY_ITEM: "DELETE_INVENTORY_ITEM",
  SET_INVENTORY_FORM: "SET_INVENTORY_FORM",
  RESET_INVENTORY_FORM: "RESET_INVENTORY_FORM",
  SET_EDITING_INVENTORY_ID: "SET_EDITING_INVENTORY_ID",
  CLEAR_INVENTORY_DATA: "CLEAR_INVENTORY_DATA",
  // SKU和批次号处理相关Action类型
  SET_SKU_PROCESSED_DATA: "SET_SKU_PROCESSED_DATA",
  SET_SKU_PROCESSING: "SET_SKU_PROCESSING",
  // MySQL数据库相关Action类型
  LOAD_INVENTORY_FROM_DB: "LOAD_INVENTORY_FROM_DB",
  SET_DB_LOADING: "SET_DB_LOADING",
};

// Reducer
function appReducer(state, action) {
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

    // 库存管理相关处理
    case ActionTypes.SET_INVENTORY_MODE:
      return { ...state, inventoryMode: action.payload };

    case ActionTypes.SET_INVENTORY_ITEMS:
      return { ...state, inventoryItems: action.payload };

    case ActionTypes.ADD_INVENTORY_ITEM:
      return {
        ...state,
        inventoryItems: [...state.inventoryItems, action.payload],
      };

    case ActionTypes.ADD_MULTIPLE_INVENTORY_ITEMS:
      return {
        ...state,
        inventoryItems: [...state.inventoryItems, ...action.payload],
      };

    case ActionTypes.UPDATE_INVENTORY_ITEM:
      return {
        ...state,
        inventoryItems: state.inventoryItems.map((item) =>
          item.id === action.payload.id ? action.payload : item
        ),
      };

    case ActionTypes.DELETE_INVENTORY_ITEM:
      return {
        ...state,
        inventoryItems: state.inventoryItems.filter(
          (item) => item.id !== action.payload
        ),
      };

    case ActionTypes.SET_INVENTORY_FORM:
      return {
        ...state,
        inventoryForm: { ...state.inventoryForm, ...action.payload },
      };

    case ActionTypes.RESET_INVENTORY_FORM:
      return {
        ...state,
        inventoryForm: {
          materialName: "",
          quantity: "",
          purchaseBatch: "",
          sku: "",
          unitPrice: "", // 单价
          totalPrice: "", // 总价
          taxRate: "13", // 税率，默认13%
          taxAmount: "", // 税额
          warehouse: "", // 仓库
        },
      };

    case ActionTypes.SET_EDITING_INVENTORY_ID:
      return { ...state, editingInventoryId: action.payload };

    case ActionTypes.CLEAR_INVENTORY_DATA:
      return { ...state, inventoryItems: [] };

    // SKU和批次号处理相关处理
    case ActionTypes.SET_SKU_PROCESSED_DATA:
      return { ...state, skuProcessedData: action.payload };

    case ActionTypes.SET_SKU_PROCESSING:
      return { ...state, isSkuProcessing: action.payload };

    // MySQL数据库相关处理
    case ActionTypes.LOAD_INVENTORY_FROM_DB:
      return { ...state, inventoryItems: action.payload };

    case ActionTypes.SET_DB_LOADING:
      return { ...state, isDbLoading: action.payload };

    case ActionTypes.RESET:
      return initialState;

    default:
      return state;
  }
}

// 创建上下文
const AppContext = createContext();

// Provider 组件
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // 在组件挂载时从数据库加载库存数据
  useEffect(() => {
    const loadInitialData = async () => {
      dispatch({ type: ActionTypes.SET_DB_LOADING, payload: true });
      try {
        const items = await getInventoryFromDatabase();
        dispatch({ type: ActionTypes.LOAD_INVENTORY_FROM_DB, payload: items });
      } catch (error) {
        console.error("初始化加载库存数据失败:", error);
        // 不设置错误状态，避免在应用启动时显示错误
      } finally {
        dispatch({ type: ActionTypes.SET_DB_LOADING, payload: false });
      }
    };

    loadInitialData();
  }, []);

  // Actions
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

    // 库存管理相关actions
    setInventoryMode: useCallback((inventoryMode) => {
      dispatch({
        type: ActionTypes.SET_INVENTORY_MODE,
        payload: inventoryMode,
      });
    }, []),

    setInventoryItems: useCallback((items) => {
      dispatch({ type: ActionTypes.SET_INVENTORY_ITEMS, payload: items });
    }, []),

    addInventoryItem: useCallback(
      async (item) => {
        dispatch({ type: ActionTypes.ADD_INVENTORY_ITEM, payload: item });
        // 保存到MySQL数据库
        try {
          const { pushInventoryToMySQL } = await import(
            "@/lib/mysqlConnection"
          );
          await pushInventoryToMySQL([...state.inventoryItems, item]);
        } catch (error) {
          console.error("保存库存项到数据库失败:", error);
        }
      },
      [state.inventoryItems]
    ),

    addMultipleInventoryItems: useCallback(
      async (items) => {
        dispatch({
          type: ActionTypes.ADD_MULTIPLE_INVENTORY_ITEMS,
          payload: items,
        });
        // 保存到MySQL数据库
        try {
          const { pushInventoryToMySQL } = await import(
            "@/lib/mysqlConnection"
          );
          await pushInventoryToMySQL([...state.inventoryItems, ...items]);
        } catch (error) {
          console.error("批量保存库存项到数据库失败:", error);
        }
      },
      [state.inventoryItems]
    ),

    updateInventoryItem: useCallback(
      async (item) => {
        dispatch({ type: ActionTypes.UPDATE_INVENTORY_ITEM, payload: item });
        // 保存到MySQL数据库
        try {
          const { pushInventoryToMySQL } = await import(
            "@/lib/mysqlConnection"
          );
          const updatedItems = state.inventoryItems.map((i) =>
            i.id === item.id ? item : i
          );
          await pushInventoryToMySQL(updatedItems);
        } catch (error) {
          console.error("更新库存项到数据库失败:", error);
        }
      },
      [state.inventoryItems]
    ),

    deleteInventoryItem: useCallback(async (id) => {
      // 先从数据库删除
      try {
        const { deleteInventoryFromMySQL } = await import(
          "@/lib/mysqlConnection"
        );
        const result = await deleteInventoryFromMySQL(id);

        if (result.success) {
          // 数据库删除成功后，更新本地状态
          dispatch({ type: ActionTypes.DELETE_INVENTORY_ITEM, payload: id });
        } else {
          console.error("删除库存项从数据库失败:", result.message);
          dispatch({
            type: ActionTypes.SET_ERROR,
            payload: `删除库存项失败: ${result.message}`,
          });
        }
      } catch (error) {
        console.error("删除库存项从数据库失败:", error);
        dispatch({
          type: ActionTypes.SET_ERROR,
          payload: `删除库存项失败: ${error.message}`,
        });
      }
    }, []),

    setInventoryForm: useCallback((formData) => {
      dispatch({ type: ActionTypes.SET_INVENTORY_FORM, payload: formData });
    }, []),

    resetInventoryForm: useCallback(() => {
      dispatch({ type: ActionTypes.RESET_INVENTORY_FORM });
    }, []),

    setEditingInventoryId: useCallback((id) => {
      dispatch({ type: ActionTypes.SET_EDITING_INVENTORY_ID, payload: id });
    }, []),

    clearInventoryData: useCallback(async () => {
      // 先清空MySQL数据库
      try {
        const { clearInventoryInMySQL } = await import("@/lib/mysqlConnection");
        const result = await clearInventoryInMySQL();

        if (result.success) {
          // 清空成功后，重新从数据库加载数据
          const items = await getInventoryFromDatabase();
          dispatch({
            type: ActionTypes.LOAD_INVENTORY_FROM_DB,
            payload: items,
          });
        } else {
          console.error("清空库存数据失败:", result.message);
          dispatch({
            type: ActionTypes.SET_ERROR,
            payload: `清空库存数据失败: ${result.message}`,
          });
        }
      } catch (error) {
        console.error("清空库存数据到数据库失败:", error);
        dispatch({
          type: ActionTypes.SET_ERROR,
          payload: `清空库存数据失败: ${error.message}`,
        });
      }
    }, []),

    // SKU和批次号处理相关actions
    setSkuProcessedData: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_SKU_PROCESSED_DATA, payload: data });
    }, []),

    setSkuProcessing: useCallback((isProcessing) => {
      dispatch({ type: ActionTypes.SET_SKU_PROCESSING, payload: isProcessing });
    }, []),

    // MySQL数据库相关actions
    loadInventoryFromDB: useCallback(async () => {
      dispatch({ type: ActionTypes.SET_DB_LOADING, payload: true });
      try {
        const items = await getInventoryFromDatabase();
        dispatch({ type: ActionTypes.LOAD_INVENTORY_FROM_DB, payload: items });
        return items;
      } catch (error) {
        console.error("从数据库加载库存数据失败:", error);
        dispatch({
          type: ActionTypes.SET_ERROR,
          payload: "从数据库加载库存数据失败",
        });
        return [];
      } finally {
        dispatch({ type: ActionTypes.SET_DB_LOADING, payload: false });
      }
    }, []),

    setDbLoading: useCallback((isLoading) => {
      dispatch({ type: ActionTypes.SET_DB_LOADING, payload: isLoading });
    }, []),

    reset: useCallback(() => {
      dispatch({ type: ActionTypes.RESET });
    }, []),
  };

  const value = {
    ...state,
    ...actions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook for using context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
