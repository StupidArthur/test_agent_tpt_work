import {runNative} from '../../automation/native-window.mjs';

async function read(ctx, args, mode) {
  const event = await ctx.recorder.read('nativeWindow', String(args.processId), {channel: 'UIA/Win32', scope: 'target application PID', mode}, async () => {
    const raw = await runNative({...args, mode}, {executionPolicy: ctx.environment.native_execution_policy});
    return {value: raw.observations, raw};
  });
  return {...event.value, evidence_ref: event.event_id};
}
export const probe = (ctx, args) => read(ctx, args, 'probe');
export const list = (ctx, args) => read(ctx, args, 'list');
export const describe = (ctx, args) => read(ctx, args, 'describe');
export const readState = (ctx, args) => read(ctx, args, 'state');
export async function restore(ctx, args) {
  let raw;
  const action = await ctx.recorder.action('nativeWindow', 'restore', args, async () => {raw = await runNative({...args, mode: 'restore'}, {executionPolicy: ctx.environment.native_execution_policy});});
  const event = await ctx.recorder.read('nativeWindow after restore', args.windowHwnd, {channel: 'Win32', scope: 'bound top-level window'}, async () => ({value: raw.observations, raw}));
  return {...event.value, action_ref: action.event_id, evidence_ref: event.event_id};
}
export async function act(ctx, args) {
  let raw;
  const action = await ctx.recorder.action('nativeWindow', args.action, args, async () => {raw = await runNative({...args, mode: 'act'}, {executionPolicy: ctx.environment.native_execution_policy});});
  const event = await ctx.recorder.read('nativeWindow after action', args.dialogHwnd, {channel: 'UIA/Win32', scope: 'bound dialog and controls'}, async () => ({value: raw.observations, raw}));
  return {...event.value, action_ref: action.event_id, evidence_ref: event.event_id};
}
