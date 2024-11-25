import { StepLambdaInput, Jsonable } from './omni-channel-types';

export interface ExecutionContext {
	Id: string;
	Input: StepLambdaInput;
	StartTime: number;
	Name: string;
	RoleArn: string;
	RedriveCount: number;
}

export interface StateMachineContext {
	Id: string;
	Name: string;
}

export interface StateContext {
	Name: string;
	EnteredTime: string;
}

export interface StepFunctionContext {
	Execution: ExecutionContext;
	StateMachine: StateMachineContext;
	State: StateContext;
}

export interface StepFunctionMapItem {
	Index: number;
	Value: Jsonable;
}

export interface StepfunctionStep {
	type: string;
	name: string;
}

export interface StepfunctionHistoryEvent {
	type?: string;
	resourceType?: string;
	error: string;
	cause: StepfunctionHistoryEventCause;
}

export interface StepfunctionHistoryEventCause {
	errorMessage: string;
}
