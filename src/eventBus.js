import { EventEmitter } from "events";
export const eventBus = new EventEmitter();

export const EVENTS = {
  PLAN_DAY_STARTED: "plan:day:started",
  ORDER_BLOCKED: "order:blocked",
  QA_REQUEST: "qa:request",
  PURCH_REQUEST: "purchasing:request",
  ORDER_OK: "order:ok",
  PLAN_DAY_DONE: "plan:day:done",
  ORDER_RESCHEDULED: "order:rescheduled",
  QA_ESTIMATE: "qa:estimate"
};
