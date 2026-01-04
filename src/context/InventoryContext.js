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
  isDbLoading: false, // 是否正在从数据库加载数据
  logs: [],
  error: null,
};

// Action 类型
const ActionTypes = {
  SET_INVENTORY_ITEMS: "SET_INVENTORY_ITEMS",
  ADD_INVENTORY_ITEM: "ADD_INVENTORY_ITEM",
  ADD_MULTIPLE_INVENTORY_ITEMS: "ADD_MULTIPLE_INVENTORY_ITEMS",
  UPDATE_INVENTORY_ITEM: "UPDATE_INVENTORY_ITEM",
  DELETE_INVENTORY_ITEM: "DELETE_INVENTORY_ITEM",
  SET_INVENTORY_FORM: "SET_INVENTORY_FORM",
  RESET_INVENTORY_FORM: "RESET_INVENTORY_FORM",
  SET_EDITING_INVENTORY_ID: "SET_EDITING_INVENTORY_ID",
  CLEAR_INVENTORY_DATA: "CLEAR_INVENTORY_DATA",
  LOAD_INVENTORY_FROM_DB: "LOAD_INVENTORY_FROM_DB",
  SET_DB_LOADING: "SET_DB_LOADING",
  ADD_LOG: "ADD_LOG",
  CLEAR_LOGS: "CLEAR_LOGS",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  RESET: "RESET",
};

// Reducer
function inventoryReducer(state, action) {
  switch (action.type) {
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

    case ActionTypes.LOAD_INVENTORY_FROM_DB:
      return { ...state, inventoryItems: action.payload };

    case ActionTypes.SET_DB_LOADING:
      return { ...state, isDbLoading: action.payload };

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

    case ActionTypes.RESET:
      return initialState;

    default:
      return state;
  }
}

// 创建上下文
const InventoryContext = createContext();

// Provider 组件
export function InventoryProvider({ children }) {
  const [state, dispatch] = useReducer(inventoryReducer, initialState);

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
    setInventoryItems: useCallback((items) => {
      dispatch({ type: ActionTypes.SET_INVENTORY_ITEMS, payload: items });
    }, []),

    addInventoryItem: useCallback(
      async (item) => {
        // 先添加到本地状态
        dispatch({ type: ActionTypes.ADD_INVENTORY_ITEM, payload: item });

        // 添加成功日志
        dispatch({
          type: ActionTypes.ADD_LOG,
          payload: {
            message: `成功添加库存项 "${item.materialName}" 到本地`,
            type: LogType.SUCCESS,
          },
        });

        // 尝试保存到MySQL数据库
        try {
          const { pushInventoryToMySQL } = await import(
            "@/lib/mysqlConnection"
          );
          const result = await pushInventoryToMySQL([
            ...state.inventoryItems,
            item,
          ]);

          if (result.success) {
            dispatch({
              type: ActionTypes.ADD_LOG,
              payload: {
                message: result.message,
                type: LogType.SUCCESS,
              },
            });
          } else {
            dispatch({
              type: ActionTypes.ADD_LOG,
              payload: {
                message: `保存到数据库失败: ${result.message}`,
                type: LogType.ERROR,
              },
            });
            dispatch({
              type: ActionTypes.SET_ERROR,
              payload: `保存到数据库失败: ${result.message}`,
            });
          }
        } catch (error) {
          console.error("保存库存项到数据库失败:", error);
          dispatch({
            type: ActionTypes.ADD_LOG,
            payload: {
              message: `保存到数据库失败: ${error.message}`,
              type: LogType.ERROR,
            },
          });
          dispatch({
            type: ActionTypes.SET_ERROR,
            payload: `保存到数据库失败: ${error.message}`,
          });
        }
      },
      [state.inventoryItems]
    ),

    addMultipleInventoryItems: useCallback(
      async (items) => {
        // 先添加到本地状态
        dispatch({
          type: ActionTypes.ADD_MULTIPLE_INVENTORY_ITEMS,
          payload: items,
        });

        // 添加成功日志
        dispatch({
          type: ActionTypes.ADD_LOG,
          payload: {
            message: `成功添加 ${items.length} 个库存项到本地`,
            type: LogType.SUCCESS,
          },
        });

        // 尝试保存到MySQL数据库
        try {
          const { pushInventoryToMySQL } = await import(
            "@/lib/mysqlConnection"
          );
          const result = await pushInventoryToMySQL([
            ...state.inventoryItems,
            ...items,
          ]);

          if (result.success) {
            dispatch({
              type: ActionTypes.ADD_LOG,
              payload: {
                message: result.message,
                type: LogType.SUCCESS,
              },
            });
          } else {
            dispatch({
              type: ActionTypes.ADD_LOG,
              payload: {
                message: `保存到数据库失败: ${result.message}`,
                type: LogType.ERROR,
              },
            });
            dispatch({
              type: ActionTypes.SET_ERROR,
              payload: `保存到数据库失败: ${result.message}`,
            });
          }
        } catch (error) {
          console.error("批量保存库存项到数据库失败:", error);
          dispatch({
            type: ActionTypes.ADD_LOG,
            payload: {
              message: `保存到数据库失败: ${error.message}`,
              type: LogType.ERROR,
            },
          });
          dispatch({
            type: ActionTypes.SET_ERROR,
            payload: `保存到数据库失败: ${error.message}`,
          });
        }
      },
      [state.inventoryItems]
    ),

    updateInventoryItem: useCallback(
      async (item) => {
        // 先更新本地状态
        dispatch({ type: ActionTypes.UPDATE_INVENTORY_ITEM, payload: item });

        // 添加成功日志
        dispatch({
          type: ActionTypes.ADD_LOG,
          payload: {
            message: `成功更新库存项 "${item.materialName}" 在本地`,
            type: LogType.SUCCESS,
          },
        });

        // 尝试保存到MySQL数据库
        try {
          const { pushInventoryToMySQL } = await import(
            "@/lib/mysqlConnection"
          );
          const updatedItems = state.inventoryItems.map((i) =>
            i.id === item.id ? item : i
          );
          const result = await pushInventoryToMySQL(updatedItems);

          if (result.success) {
            dispatch({
              type: ActionTypes.ADD_LOG,
              payload: {
                message: result.message,
                type: LogType.SUCCESS,
              },
            });
          } else {
            dispatch({
              type: ActionTypes.ADD_LOG,
              payload: {
                message: `更新到数据库失败: ${result.message}`,
                type: LogType.ERROR,
              },
            });
            dispatch({
              type: ActionTypes.SET_ERROR,
              payload: `更新到数据库失败: ${result.message}`,
            });
          }
        } catch (error) {
          console.error("更新库存项到数据库失败:", error);
          dispatch({
            type: ActionTypes.ADD_LOG,
            payload: {
              message: `更新到数据库失败: ${error.message}`,
              type: LogType.ERROR,
            },
          });
          dispatch({
            type: ActionTypes.SET_ERROR,
            payload: `更新到数据库失败: ${error.message}`,
          });
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

    reset: useCallback(() => {
      dispatch({ type: ActionTypes.RESET });
    }, []),
  };

  const value = {
    ...state,
    ...actions,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

// Hook for using context
export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
}
