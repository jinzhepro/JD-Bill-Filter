"use client";

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
} from "react";

const initialState = {
  basicInfo: {
    companyName: "青岛青云通公共服务有限公司",
    contractNo: "JK-GQ-250117",
    applyDate: new Date().toISOString().split("T")[0],
    department: "青云通",
    applicant: "付冰清",
  },
  customerInfo: {
    customerName: "",
    taxId: "",
    bankName: "",
    bankAccount: "",
    address: "",
    phone: "",
  },
  lineItems: [],
  invoiceDate: "",
};

const ActionTypes = {
  SET_BASIC_INFO: "SET_BASIC_INFO",
  SET_CUSTOMER_INFO: "SET_CUSTOMER_INFO",
  ADD_LINE_ITEM: "ADD_LINE_ITEM",
  UPDATE_LINE_ITEM: "UPDATE_LINE_ITEM",
  REMOVE_LINE_ITEM: "REMOVE_LINE_ITEM",
  RESET: "RESET",
  CLEAR_LINE_ITEMS: "CLEAR_LINE_ITEMS",
  SET_INVOICE_DATE: "SET_INVOICE_DATE",
};

function invoiceReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_BASIC_INFO:
      return { ...state, basicInfo: { ...state.basicInfo, ...action.payload } };
    case ActionTypes.SET_CUSTOMER_INFO:
      return { ...state, customerInfo: { ...state.customerInfo, ...action.payload } };
    case ActionTypes.ADD_LINE_ITEM:
      return { ...state, lineItems: [...state.lineItems, action.payload] };
    case ActionTypes.UPDATE_LINE_ITEM:
      return {
        ...state,
        lineItems: state.lineItems.map((item, index) =>
          index === action.payload.index ? { ...item, ...action.payload.data } : item
        ),
      };
    case ActionTypes.REMOVE_LINE_ITEM:
      return {
        ...state,
        lineItems: state.lineItems.filter((_, index) => index !== action.payload),
      };
    case ActionTypes.RESET:
      return initialState;
    case ActionTypes.CLEAR_LINE_ITEMS:
      return { ...state, lineItems: [] };
    case ActionTypes.SET_INVOICE_DATE:
      return { ...state, invoiceDate: action.payload };
    default:
      return state;
  }
}

const InvoiceContext = createContext();

export function InvoiceProvider({ children }) {
  const [state, dispatch] = useReducer(invoiceReducer, initialState);

  const actions = useMemo(() => ({
    setBasicInfo: (data) => dispatch({ type: ActionTypes.SET_BASIC_INFO, payload: data }),
    setCustomerInfo: (data) => dispatch({ type: ActionTypes.SET_CUSTOMER_INFO, payload: data }),
    addLineItem: (item) => dispatch({ type: ActionTypes.ADD_LINE_ITEM, payload: item }),
    updateLineItem: (index, data) => dispatch({ type: ActionTypes.UPDATE_LINE_ITEM, payload: { index, data } }),
    removeLineItem: (index) => dispatch({ type: ActionTypes.REMOVE_LINE_ITEM, payload: index }),
    reset: () => dispatch({ type: ActionTypes.RESET }),
    clearLineItems: () => dispatch({ type: ActionTypes.CLEAR_LINE_ITEMS }),
    setInvoiceDate: (date) => dispatch({ type: ActionTypes.SET_INVOICE_DATE, payload: date }),
  }), []);

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);

  return <InvoiceContext.Provider value={value}>{children}</InvoiceContext.Provider>;
}

export function useInvoice() {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error("useInvoice must be used within an InvoiceProvider");
  }
  return context;
}