import { LlmAdapter, LlmError, ReasoningEffortId, RetryPolicySchema, attributionHeaders, contentHasImage, resolveRetryPolicy } from "@deepseek-ai/dsh-llm";
//#region ../../../node_modules/.pnpm/@deepseek-ai+cosmokit@1.8.5/node_modules/@deepseek-ai/cosmokit/lib/index.js
/** Return true when a value is `null` or `undefined`. */
function isNullable(value) {
	return value === null || value === void 0;
}
/** Return true for non-array object values. */
function isPlainObject(data) {
	return data && typeof data === "object" && !Array.isArray(data);
}
/** Filter object entries and return a new object. */
function filterKeys(object, filter) {
	return Object.fromEntries(Object.entries(object).filter(([key, value]) => filter(key, value)));
}
/** Map object values while preserving the original key set. */
function mapValues(object, transform) {
	return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transform(value, key)]));
}
/** Pick selected keys from an object, optionally including `undefined` values. */
function pick(source, keys, forced) {
	if (!keys) return { ...source };
	const result = {};
	for (const key of keys) if (forced || source[key] !== void 0) result[key] = source[key];
	return result;
}
/** Define a non-enumerable writable property and return the object. */
function defineProperty(object, key, value) {
	return Object.defineProperty(object, key, {
		writable: true,
		value,
		enumerable: false
	});
}
/** Shared config references used by schema validators and plugin runtimes. */
const write = Symbol.for("cosmokit.volatile.write");
function snapshot(value, ancestors = /* @__PURE__ */ new Set()) {
	if (typeof value === "function") throw new TypeError("volatile config cannot contain functions");
	if (value === null || typeof value !== "object") return value;
	if (ancestors.has(value)) throw new TypeError("volatile config cannot contain cycles");
	ancestors.add(value);
	try {
		if (Array.isArray(value)) return Object.freeze(value.map((item) => snapshot(item, ancestors)));
		if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new TypeError("volatile config objects must be plain objects or arrays");
		return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, snapshot(item, ancestors)])));
	} finally {
		ancestors.delete(value);
	}
}
/**
* Create a detached reference containing an immutable copy of the supplied data.
* @param value - validated config data; class instances and functions are unsupported.
* @returns a reference whose value is updated only by its owning runtime.
*/
function createVolatile(value) {
	let current = snapshot(value);
	return Object.freeze({
		get: () => current,
		[write]: (value) => {
			current = value;
		}
	});
}
/**
* Identify references across ESM/CJS copies of the shared library.
* @param value - a parsed config value.
* @returns whether the value implements the shared reference protocol.
*/
function isVolatile(value) {
	return typeof value === "object" && value !== null && write in value;
}
/** Test values using `instanceof` with a `toStringTag` fallback. */
function is(type, value) {
	if (arguments.length === 1) return (value) => is(type, value);
	return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
}
function isArrayBufferLike(value) {
	return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
}
function isArrayBufferSource(value) {
	return isArrayBufferLike(value) || ArrayBuffer.isView(value);
}
/** Binary source detection and base64/hex conversion helpers. */
var Binary;
(function(Binary) {
	Binary.is = isArrayBufferLike;
	Binary.isSource = isArrayBufferSource;
	function fromSource(source) {
		if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
		else return source;
	}
	Binary.fromSource = fromSource;
	function toBase64(source) {
		source = fromSource(source);
		if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
		let binary = "";
		const bytes = new Uint8Array(source);
		for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
		return btoa(binary);
	}
	Binary.toBase64 = toBase64;
	function fromBase64(source) {
		if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
		return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
	}
	Binary.fromBase64 = fromBase64;
	function toHex(source) {
		source = fromSource(source);
		if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
		return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
	}
	Binary.toHex = toHex;
	function fromHex(source) {
		if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
		const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
		const buffer = [];
		for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
		return Uint8Array.from(buffer).buffer;
	}
	Binary.fromHex = fromHex;
})(Binary || (Binary = {}));
Binary.fromBase64;
Binary.toBase64;
Binary.fromHex;
Binary.toHex;
/** Deep-clone common JavaScript values while preserving prototypes and cycles. */
function clone(source, refs = /* @__PURE__ */ new Map()) {
	if (!source || typeof source !== "object") return source;
	if (is("Date", source)) return new Date(source.valueOf());
	if (is("RegExp", source)) return new RegExp(source.source, source.flags);
	if (isArrayBufferLike(source)) return source.slice(0);
	if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
	const cached = refs.get(source);
	if (cached) return cached;
	if (Array.isArray(source)) {
		const result = [];
		refs.set(source, result);
		source.forEach((value, index) => {
			result[index] = Reflect.apply(clone, null, [value, refs]);
		});
		return result;
	}
	const result = Object.create(Object.getPrototypeOf(source));
	refs.set(source, result);
	for (const key of Reflect.ownKeys(source)) {
		const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key) };
		if ("value" in descriptor) descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
		Reflect.defineProperty(result, key, descriptor);
	}
	return result;
}
/**
* Compare values recursively, treating two volatile references as equal regardless of value.
* Strict comparison distinguishes null/undefined, treats opaque objects by identity,
* compares URLs by normalized href, treats array holes as undefined, and considers distinct cyclic structures unequal.
* @param a - first value.
* @param b - second value.
* @param strict - whether to require strict data equality outside volatile references.
* @returns whether the values compare equal.
*/
function deepEqual(a, b, strict) {
	const ancestors = /* @__PURE__ */ new Set();
	function compare(a, b) {
		if (a === b) return true;
		if (isVolatile(a) || isVolatile(b)) return isVolatile(a) && isVolatile(b);
		if (!strict && isNullable(a) && isNullable(b)) return true;
		if (typeof a !== typeof b || typeof a !== "object" || !a || !b) return false;
		if (ancestors.has(a)) return false;
		function check(test, then) {
			return test(a) ? test(b) ? then(a, b) : false : test(b) ? false : void 0;
		}
		ancestors.add(a);
		try {
			return check(Array.isArray, (a, b) => {
				if (a.length !== b.length) return false;
				for (let index = 0; index < a.length; index++) if (!compare(a[index], b[index])) return false;
				return true;
			}) ?? check(is("Date"), (a, b) => a.valueOf() === b.valueOf()) ?? check(is("URL"), (a, b) => a.href === b.href) ?? check(is("RegExp"), (a, b) => a.source === b.source && a.flags === b.flags) ?? check(isArrayBufferLike, (a, b) => {
				if (a.byteLength !== b.byteLength) return false;
				const viewA = new Uint8Array(a);
				const viewB = new Uint8Array(b);
				for (let i = 0; i < viewA.length; i++) if (viewA[i] !== viewB[i]) return false;
				return true;
			}) ?? ((!strict || [a, b].every((value) => Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) && Object.keys({
				...a,
				...b
			}).every((key) => compare(a[key], b[key])));
		} finally {
			ancestors.delete(a);
		}
	}
	return compare(a, b);
}
function tokenize(source, delimiters, delimiter) {
	const output = [];
	let state = 0;
	for (let i = 0; i < source.length; i++) {
		const code = source.charCodeAt(i);
		if (code >= 65 && code <= 90) {
			if (state === 1) {
				const next = source.charCodeAt(i + 1);
				if (next >= 97 && next <= 122) output.push(delimiter);
				output.push(code + 32);
			} else {
				if (state !== 0) output.push(delimiter);
				output.push(code + 32);
			}
			state = 1;
		} else if (code >= 97 && code <= 122) {
			output.push(code);
			state = 2;
		} else if (delimiters.includes(code)) {
			if (state !== 0) output.push(delimiter);
			state = 0;
		} else output.push(code);
	}
	return String.fromCharCode(...output);
}
/** Convert text to dash-delimited parameter case. */
function paramCase(source) {
	return tokenize(source, [45, 95], 45);
}
/** Runtime alias for `paramCase`. */
const hyphenate = paramCase;
/** Time constants plus parsing and formatting helpers. */
var Time;
(function(Time) {
	Time.millisecond = 1;
	Time.second = 1e3;
	Time.minute = Time.second * 60;
	Time.hour = Time.minute * 60;
	Time.day = Time.hour * 24;
	Time.week = Time.day * 7;
	let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
	function setTimezoneOffset(offset) {
		timezoneOffset = offset;
	}
	Time.setTimezoneOffset = setTimezoneOffset;
	function getTimezoneOffset() {
		return timezoneOffset;
	}
	Time.getTimezoneOffset = getTimezoneOffset;
	function getDateNumber(date = /* @__PURE__ */ new Date(), offset) {
		if (typeof date === "number") date = new Date(date);
		if (offset === void 0) offset = timezoneOffset;
		return Math.floor((date.valueOf() / Time.minute - offset) / 1440);
	}
	Time.getDateNumber = getDateNumber;
	function fromDateNumber(value, offset) {
		const date = new Date(value * Time.day);
		if (offset === void 0) offset = timezoneOffset;
		return new Date(+date + offset * Time.minute);
	}
	Time.fromDateNumber = fromDateNumber;
	const numeric = /\d+(?:\.\d+)?/.source;
	const timeRegExp = new RegExp(`^${[
		"w(?:eek(?:s)?)?",
		"d(?:ay(?:s)?)?",
		"h(?:our(?:s)?)?",
		"m(?:in(?:ute)?(?:s)?)?",
		"s(?:ec(?:ond)?(?:s)?)?"
	].map((unit) => `(${numeric}${unit})?`).join("")}$`);
	function parseTime(source) {
		const capture = timeRegExp.exec(source);
		if (!capture) return 0;
		return (parseFloat(capture[1]) * Time.week || 0) + (parseFloat(capture[2]) * Time.day || 0) + (parseFloat(capture[3]) * Time.hour || 0) + (parseFloat(capture[4]) * Time.minute || 0) + (parseFloat(capture[5]) * Time.second || 0);
	}
	Time.parseTime = parseTime;
	function parseDate(date) {
		const parsed = parseTime(date);
		if (parsed) date = Date.now() + parsed;
		else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date}`;
		else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date}`;
		return date ? new Date(date) : /* @__PURE__ */ new Date();
	}
	Time.parseDate = parseDate;
	function format(ms) {
		const abs = Math.abs(ms);
		if (abs >= Time.day - Time.hour / 2) return Math.round(ms / Time.day) + "d";
		else if (abs >= Time.hour - Time.minute / 2) return Math.round(ms / Time.hour) + "h";
		else if (abs >= Time.minute - Time.second / 2) return Math.round(ms / Time.minute) + "m";
		else if (abs >= Time.second) return Math.round(ms / Time.second) + "s";
		return ms + "ms";
	}
	Time.format = format;
	function toDigits(source, length = 2) {
		return source.toString().padStart(length, "0");
	}
	Time.toDigits = toDigits;
	function template(template, time = /* @__PURE__ */ new Date()) {
		return template.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
	}
	Time.template = template;
})(Time || (Time = {}));
//#endregion
//#region ../../../node_modules/.pnpm/@deepseek-ai+schemastery@3.18.4/node_modules/@deepseek-ai/schemastery/lib/index.mjs
const kSchema = Symbol.for("schemastery");
const kValidationError$1 = Symbol.for("ValidationError");
globalThis.__schemastery_index__ ??= 0;
globalThis.__schemastery_refs__ = void 0;
var ValidationError$1 = class extends TypeError {
	options;
	name = "ValidationError";
	constructor(message, options) {
		let prefix = "$";
		for (const segment of options.path || []) if (typeof segment === "string") prefix += "." + segment;
		else if (typeof segment === "number") prefix += "[" + segment + "]";
		else if (typeof segment === "symbol") prefix += `[Symbol(${segment.toString()})]`;
		if (prefix.startsWith(".")) prefix = prefix.slice(1);
		super((prefix === "$" ? "" : `${prefix} `) + message);
		this.options = options;
	}
	static is(error) {
		return !!error?.[kValidationError$1];
	}
};
Object.defineProperty(ValidationError$1.prototype, kValidationError$1, { value: true });
const Schema = function(options) {
	const schema = function(data, options = {}) {
		return Schema.resolve(data, schema, options)[0];
	};
	if (options.refs) {
		const refs = mapValues(options.refs, (options) => new Schema(options));
		const getRef = (uid) => refs[uid];
		for (const key in refs) {
			const options = refs[key];
			options.sKey = getRef(options.sKey);
			options.inner = getRef(options.inner);
			options.list = options.list && options.list.map(getRef);
			options.dict = options.dict && mapValues(options.dict, getRef);
		}
		return refs[options.uid];
	}
	Object.assign(schema, options);
	if (typeof schema.callback === "string") try {
		schema.callback = new Function("return " + schema.callback)();
	} catch {}
	Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
	Object.setPrototypeOf(schema, Schema.prototype);
	schema.meta ||= {};
	schema.toString = schema.toString.bind(schema);
	return schema;
};
Schema.prototype = Object.create(Function.prototype);
Schema.prototype[kSchema] = true;
Object.defineProperty(Schema.prototype, "~standard", { get() {
	return {
		version: 1,
		vendor: "schemastery",
		validate: (value) => {
			try {
				return { value: Schema.resolve(value, this, {})[0] };
			} catch (error) {
				if (ValidationError$1.is(error)) return { issues: [{
					message: error.message,
					path: error.options.path
				}] };
				throw error;
			}
		}
	};
} });
Schema.ValidationError = ValidationError$1;
Schema.prototype.toJSON = function toJSON() {
	if (globalThis.__schemastery_refs__) {
		globalThis.__schemastery_refs__[this.uid] ??= JSON.parse(JSON.stringify({ ...this }));
		return this.uid;
	}
	globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
	globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
	const result = {
		uid: this.uid,
		refs: globalThis.__schemastery_refs__
	};
	globalThis.__schemastery_refs__ = void 0;
	return result;
};
Schema.prototype.set = function set(key, value) {
	this.dict[key] = value;
	return this;
};
Schema.prototype.push = function push(value) {
	this.list.push(value);
	return this;
};
function mergeDesc(original, messages) {
	const result = typeof original === "string" ? { "": original } : { ...original };
	for (const locale in messages) {
		const value = messages[locale];
		if (value?.$description || value?.$desc) result[locale] = value.$description || value.$desc;
		else if (typeof value === "string") result[locale] = value;
	}
	return result;
}
function getInner(value) {
	return value?.$value ?? value?.$inner;
}
function extractKeys(data) {
	return filterKeys(data ?? {}, (key) => !key.startsWith("$"));
}
Schema.prototype.i18n = function i18n(messages) {
	const schema = Schema(this);
	const desc = mergeDesc(schema.meta.description, messages);
	if (Object.keys(desc).length) schema.meta.description = desc;
	if (schema.dict) schema.dict = mapValues(schema.dict, (inner, key) => {
		return inner.i18n(mapValues(messages, (data) => getInner(data)?.[key] ?? data?.[key]));
	});
	if (schema.list) schema.list = schema.list.map((inner, index) => {
		return inner.i18n(mapValues(messages, (data = {}) => {
			if (Array.isArray(getInner(data))) return getInner(data)[index];
			if (Array.isArray(data)) return data[index];
			return extractKeys(data);
		}));
	});
	if (schema.inner) schema.inner = schema.inner.i18n(mapValues(messages, (data) => {
		if (getInner(data)) return getInner(data);
		return extractKeys(data);
	}));
	if (schema.sKey) schema.sKey = schema.sKey.i18n(mapValues(messages, (data) => data?.$key));
	return schema;
};
Schema.prototype.extra = function extra(key, value) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		[key]: value
	};
	return schema;
};
for (const key of [
	"required",
	"disabled",
	"collapse",
	"hidden",
	"loose"
]) Object.assign(Schema.prototype, { [key](value = true) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		[key]: value
	};
	return schema;
} });
Schema.prototype.deprecated = function deprecated() {
	const schema = Schema(this);
	schema.meta.badges ||= [];
	schema.meta.badges.push({
		text: "deprecated",
		type: "danger"
	});
	return schema;
};
Schema.prototype.experimental = function experimental() {
	const schema = Schema(this);
	schema.meta.badges ||= [];
	schema.meta.badges.push({
		text: "experimental",
		type: "warning"
	});
	return schema;
};
Schema.prototype.pattern = function pattern(regexp) {
	const schema = Schema(this);
	const pattern = pick(regexp, ["source", "flags"]);
	schema.meta = {
		...schema.meta,
		pattern
	};
	return schema;
};
Schema.prototype.simplify = function simplify(value) {
	if (isVolatile(value)) value = value.get();
	if (deepEqual(value, this.meta.default, this.type === "dict")) return null;
	if (isNullable(value)) return value;
	if (this.type === "object" || this.type === "dict") {
		const result = {};
		for (const key in value) {
			const item = (this.type === "object" ? this.dict[key] : this.inner)?.simplify(value[key]);
			if (this.type === "dict" || !isNullable(item)) result[key] = item;
		}
		if (deepEqual(result, this.meta.default, this.type === "dict")) return null;
		return result;
	} else if (this.type === "array" || this.type === "tuple") {
		const result = [];
		value.forEach((value, index) => {
			const schema = this.type === "array" ? this.inner : this.list[index];
			const item = schema ? schema.simplify(value) : value;
			result.push(item);
		});
		return result;
	} else if (this.type === "intersect") {
		const result = {};
		for (const item of this.list) Object.assign(result, item.simplify(value));
		return result;
	} else if (this.type === "union") for (const schema of this.list) try {
		Schema.resolve(value, schema, {});
		return schema.simplify(value);
	} catch {}
	return value;
};
Schema.prototype.toString = function toString(inline) {
	return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
};
Schema.prototype.role = function role(role, extra) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		role,
		extra
	};
	return schema;
};
for (const key of [
	"default",
	"link",
	"comment",
	"description",
	"max",
	"min",
	"step"
]) Object.assign(Schema.prototype, { [key](value) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		[key]: value
	};
	return schema;
} });
Schema.prototype.volatile = function volatile() {
	if (this.meta.volatile) throw new TypeError("volatile schema is already wrapped");
	return this.extra("volatile", true);
};
const resolvers = {};
const checkedVolatile = Symbol("checked-volatile-schema");
function validateVolatileSchema(schema, path = [], blocked = false, seen = /* @__PURE__ */ new Map()) {
	const states = seen.get(schema) ?? /* @__PURE__ */ new Set();
	if (states.has(blocked)) return;
	states.add(blocked);
	seen.set(schema, states);
	if (schema.meta?.volatile && blocked) throw new ValidationError$1("volatile fields require a fixed object path without an enclosing volatile field", { path });
	const nested = blocked || !!schema.meta?.volatile;
	if (schema.dict) for (const [key, child] of Object.entries(schema.dict)) validateVolatileSchema(child, [...path, key], nested, seen);
	if (schema.sKey) validateVolatileSchema(schema.sKey, [...path, "<key>"], true, seen);
	if (schema.inner && (schema.type !== "lazy" || schema.inner[kSchema])) validateVolatileSchema(schema.inner, [...path, "*"], true, seen);
	if (schema.list) for (let index = 0; index < schema.list.length; index++) validateVolatileSchema(schema.list[index], [...path, String(index)], true, seen);
}
Schema.extend = function extend(type, resolve) {
	resolvers[type] = resolve;
};
Schema.resolve = function resolve(data, schema, options = {}, strict = false) {
	if (!schema) return [data];
	if (!options[checkedVolatile]) {
		validateVolatileSchema(schema, options.path);
		options = {
			...options,
			[checkedVolatile]: true
		};
	}
	if (schema.meta?.volatile) {
		const inner = Schema(schema);
		inner.meta = {
			...schema.meta,
			volatile: false
		};
		const [value, adapted] = Schema.resolve(data, inner, options, strict);
		try {
			return [createVolatile(value), adapted];
		} catch (error) {
			throw new ValidationError$1(error instanceof Error ? error.message : String(error), options);
		}
	}
	if (options.ignore?.(data, schema)) return [data];
	if (isNullable(data) && schema.type !== "lazy") {
		if (schema.meta.required) throw new ValidationError$1(`missing required value`, options);
		let current = schema;
		let fallback = schema.meta.default;
		while (current?.type === "intersect" && isNullable(fallback)) {
			current = current.list[0];
			fallback = current?.meta.default;
		}
		if (isNullable(fallback)) return [data];
		data = clone(fallback);
	}
	const callback = resolvers[schema.type];
	if (!callback) throw new ValidationError$1(`unsupported type "${schema.type}"`, options);
	try {
		return callback(data, schema, options, strict);
	} catch (error) {
		if (!schema.meta.loose) throw error;
		return [schema.meta.default];
	}
};
Schema.from = function from(source) {
	if (isNullable(source)) return Schema.any();
	else if ([
		"string",
		"number",
		"boolean"
	].includes(typeof source)) return Schema.const(source).required();
	else if (source[kSchema]) return source;
	else if (typeof source === "function") switch (source) {
		case String: return Schema.string().required();
		case Number: return Schema.number().required();
		case Boolean: return Schema.boolean().required();
		case Function: return Schema.function().required();
		default: return Schema.is(source).required();
	}
	else throw new TypeError(`cannot infer schema from ${source}`);
};
Schema.lazy = function lazy(builder) {
	const toJSON = () => {
		if (!schema.inner[kSchema]) {
			schema.inner = schema.builder();
			schema.inner.meta = {
				...schema.meta,
				...schema.inner.meta
			};
		}
		return schema.inner.toJSON();
	};
	const schema = new Schema({
		type: "lazy",
		builder,
		inner: { toJSON }
	});
	return schema;
};
Schema.natural = function natural() {
	return Schema.number().step(1).min(0);
};
Schema.percent = function percent() {
	return Schema.number().step(.01).min(0).max(1).role("slider");
};
Schema.date = function date() {
	return Schema.union([Schema.is(Date), Schema.transform(Schema.string().role("datetime"), (value, options) => {
		const date = new Date(value);
		if (isNaN(+date)) throw new ValidationError$1(`invalid date "${value}"`, options);
		return date;
	}, true)]);
};
Schema.regExp = function regExp(flag = "") {
	return Schema.union([Schema.is(RegExp), Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
		try {
			return new RegExp(value, flag);
		} catch (e) {
			throw new ValidationError$1(e.message, options);
		}
	}, true)]);
};
Schema.arrayBuffer = function arrayBuffer(encoding) {
	return Schema.union([
		Schema.is(ArrayBuffer),
		Schema.is(SharedArrayBuffer),
		Schema.transform(Schema.any(), (value, options) => {
			if (Binary.isSource(value)) return Binary.fromSource(value);
			throw new ValidationError$1(`expected ArrayBufferSource but got ${value}`, options);
		}, true),
		...encoding ? [Schema.transform(Schema.string(), (value, options) => {
			try {
				return encoding === "base64" ? Binary.fromBase64(value) : Binary.fromHex(value);
			} catch (e) {
				throw new ValidationError$1(e.message, options);
			}
		}, true)] : []
	]);
};
Schema.extend("lazy", (data, schema, options, strict) => {
	if (!schema.inner[kSchema]) {
		schema.inner = schema.builder();
		schema.inner.meta = {
			...schema.meta,
			...schema.inner.meta
		};
		validateVolatileSchema(schema.inner, options.path, true);
	}
	return Schema.resolve(data, schema.inner, options, strict);
});
Schema.extend("any", (data) => {
	return [data];
});
Schema.extend("never", (data, _, options) => {
	throw new ValidationError$1(`expected nullable but got ${data}`, options);
});
Schema.extend("const", (data, { value }, options) => {
	if (deepEqual(data, value)) return [value];
	throw new ValidationError$1(`expected ${value} but got ${data}`, options);
});
function checkWithinRange(data, meta, description, options, skipMin = false) {
	const { max = Infinity, min = -Infinity } = meta;
	if (data > max) throw new ValidationError$1(`expected ${description} <= ${max} but got ${data}`, options);
	if (data < min && !skipMin) throw new ValidationError$1(`expected ${description} >= ${min} but got ${data}`, options);
}
Schema.extend("string", (data, { meta }, options) => {
	if (typeof data !== "string") throw new ValidationError$1(`expected string but got ${data}`, options);
	if (meta.pattern) {
		const regexp = new RegExp(meta.pattern.source, meta.pattern.flags);
		if (!regexp.test(data)) throw new ValidationError$1(`expect string to match regexp ${regexp}`, options);
	}
	checkWithinRange(data.length, meta, "string length", options);
	return [data];
});
function decimalShift(data, digits) {
	const str = data.toString();
	if (str.includes("e")) return data * Math.pow(10, digits);
	const index = str.indexOf(".");
	if (index === -1) return data * Math.pow(10, digits);
	const frac = str.slice(index + 1);
	const integer = str.slice(0, index);
	if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
	return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
}
function isMultipleOf(data, min, step) {
	step = Math.abs(step);
	if (!/^\d+\.\d+$/.test(step.toString())) return (data - min) % step === 0;
	const index = step.toString().indexOf(".");
	const digits = step.toString().slice(index + 1).length;
	return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
}
Schema.extend("number", (data, { meta }, options) => {
	if (typeof data !== "number") throw new ValidationError$1(`expected number but got ${data}`, options);
	checkWithinRange(data, meta, "number", options);
	const { step } = meta;
	if (step && !isMultipleOf(data, meta.min ?? 0, step)) throw new ValidationError$1(`expected number multiple of ${step} but got ${data}`, options);
	return [data];
});
Schema.extend("boolean", (data, _, options) => {
	if (typeof data === "boolean") return [data];
	throw new ValidationError$1(`expected boolean but got ${data}`, options);
});
Schema.extend("bitset", (data, { bits, meta }, options) => {
	let value = 0, keys = [];
	if (typeof data === "number") {
		value = data;
		for (const key in bits) if (data & bits[key]) keys.push(key);
	} else if (Array.isArray(data)) {
		keys = data;
		for (const key of keys) {
			if (typeof key !== "string") throw new ValidationError$1(`expected string but got ${key}`, options);
			if (key in bits) value |= bits[key];
		}
	} else throw new ValidationError$1(`expected number or array but got ${data}`, options);
	if (value === meta.default) return [value];
	return [value, keys];
});
Schema.extend("function", (data, _, options) => {
	if (typeof data === "function") return [data];
	throw new ValidationError$1(`expected function but got ${data}`, options);
});
Schema.extend("is", (data, { constructor }, options) => {
	if (typeof constructor === "function") {
		if (data instanceof constructor) return [data];
		throw new ValidationError$1(`expected ${constructor.name} but got ${data}`, options);
	} else {
		if (isNullable(data)) throw new ValidationError$1(`expected ${constructor} but got ${data}`, options);
		let prototype = Object.getPrototypeOf(data);
		while (prototype) {
			if (prototype.constructor?.name === constructor) return [data];
			prototype = Object.getPrototypeOf(prototype);
		}
		throw new ValidationError$1(`expected ${constructor} but got ${data}`, options);
	}
});
function property(data, key, schema, options) {
	try {
		const [value, adapted] = Schema.resolve(data[key], schema, {
			...options,
			path: [...options.path || [], key]
		});
		if (adapted !== void 0) data[key] = adapted;
		return value;
	} catch (e) {
		if (!options?.autofix) throw e;
		delete data[key];
		return schema.meta.volatile ? createVolatile(schema.meta.default) : schema.meta.default;
	}
}
Schema.extend("array", (data, { inner, meta }, options) => {
	if (!Array.isArray(data)) throw new ValidationError$1(`expected array but got ${data}`, options);
	checkWithinRange(data.length, meta, "array length", options, !isNullable(inner.meta.default));
	return [data.map((_, index) => property(data, index, inner, options))];
});
Schema.extend("dict", (data, { inner, sKey }, options, strict) => {
	if (!isPlainObject(data)) throw new ValidationError$1(`expected object but got ${data}`, options);
	const result = {};
	for (const key in data) {
		let rKey;
		try {
			rKey = Schema.resolve(key, sKey, options)[0];
		} catch (error) {
			if (strict) continue;
			throw error;
		}
		result[rKey] = property(data, key, inner, options);
		data[rKey] = data[key];
		if (key !== rKey) delete data[key];
	}
	return [result];
});
Schema.extend("tuple", (data, { list }, options, strict) => {
	if (!Array.isArray(data)) throw new ValidationError$1(`expected array but got ${data}`, options);
	const result = list.map((inner, index) => property(data, index, inner, options));
	if (strict) return [result];
	result.push(...data.slice(list.length));
	return [result];
});
function merge(result, data) {
	for (const key in data) {
		if (key in result) continue;
		result[key] = data[key];
	}
}
Schema.extend("object", (data, { dict }, options, strict) => {
	if (!isPlainObject(data)) throw new ValidationError$1(`expected object but got ${data}`, options);
	const result = {};
	for (const key in dict) {
		const value = property(data, key, dict[key], options);
		if (!isNullable(value) || key in data) result[key] = value;
	}
	if (!strict) merge(result, data);
	return [result];
});
Schema.extend("union", (data, { list, toString }, options, strict) => {
	const messages = [];
	for (const inner of list) try {
		return Schema.resolve(data, inner, options, strict);
	} catch (error) {
		messages.push(error);
	}
	throw new ValidationError$1(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
});
Schema.extend("intersect", (data, { list, toString }, options, strict) => {
	if (!list.length) return [data];
	let result;
	for (const inner of list) {
		const value = Schema.resolve(data, inner, options, true)[0];
		if (isNullable(value)) continue;
		if (isNullable(result)) result = value;
		else if (typeof result !== typeof value) throw new ValidationError$1(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
		else if (typeof value === "object") merge(result ??= {}, value);
		else if (result !== value) throw new ValidationError$1(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
	}
	if (!strict && isPlainObject(data)) merge(result, data);
	return [result];
});
Schema.extend("transform", (data, { inner, callback, preserve }, options) => {
	const [result, adapted = data] = Schema.resolve(data, inner, options, true);
	if (preserve) return [callback(result)];
	else return [callback(result), callback(adapted)];
});
const formatters = {};
function defineMethod(name, keys, format) {
	formatters[name] = format;
	Object.assign(Schema, { [name](...args) {
		const schema = new Schema({ type: name });
		keys.forEach((key, index) => {
			switch (key) {
				case "sKey":
					schema.sKey = args[index] ?? Schema.string();
					break;
				case "inner":
					schema.inner = Schema.from(args[index]);
					break;
				case "list":
					schema.list = args[index].map(Schema.from);
					break;
				case "dict":
					schema.dict = mapValues(args[index], Schema.from);
					break;
				case "bits":
					schema.bits = {};
					for (const key in args[index]) {
						if (typeof args[index][key] !== "number") continue;
						schema.bits[key] = args[index][key];
					}
					break;
				case "callback": {
					const callback = schema.callback = args[index];
					callback["toJSON"] ||= () => callback.toString();
					break;
				}
				case "constructor": {
					const constructor = schema.constructor = args[index];
					if (typeof constructor === "function") constructor["toJSON"] ||= () => constructor["name"];
					break;
				}
				default: schema[key] = args[index];
			}
		});
		if (name === "object" || name === "dict") schema.meta.default = {};
		else if (name === "array" || name === "tuple") schema.meta.default = [];
		else if (name === "bitset") schema.meta.default = 0;
		return schema;
	} });
}
defineMethod("is", ["constructor"], ({ constructor }) => {
	if (typeof constructor === "function") return constructor.name;
	else return constructor;
});
defineMethod("any", [], () => "any");
defineMethod("never", [], () => "never");
defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
defineMethod("string", [], () => "string");
defineMethod("number", [], () => "number");
defineMethod("boolean", [], () => "boolean");
defineMethod("bitset", ["bits"], () => "bitset");
defineMethod("function", [], () => "function");
defineMethod("array", ["inner"], ({ inner }) => `${inner.toString(true)}[]`);
defineMethod("dict", ["inner", "sKey"], ({ inner, sKey }) => `{ [key: ${sKey.toString()}]: ${inner.toString()} }`);
defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner) => inner.toString()).join(", ")}]`);
defineMethod("object", ["dict"], ({ dict }) => {
	if (Object.keys(dict).length === 0) return "{}";
	return `{ ${Object.entries(dict).map(([key, inner]) => {
		return `${key}${inner.meta.required ? "" : "?"}: ${inner.toString()}`;
	}).join(", ")} }`;
});
defineMethod("union", ["list"], ({ list }, inline) => {
	const result = list.map(({ toString: format }) => format()).join(" | ");
	return inline ? `(${result})` : result;
});
defineMethod("intersect", ["list"], ({ list }) => {
	return `${list.map((inner) => inner.toString(true)).join(" & ")}`;
});
defineMethod("transform", [
	"inner",
	"callback",
	"preserve"
], ({ inner }, isInner) => inner.toString(isInner));
//#endregion
//#region ../../../node_modules/.pnpm/@deepseek-ai+cordis@4.0.4_@_f26b922a7ef2f8fed990b442fc983a03/node_modules/@deepseek-ai/cordis/lib/index.js
/** Ordered collection of disposable values with O(1) deletion by value. */
var DisposableList = class {
	sn = 0;
	map = /* @__PURE__ */ new Map();
	weak = /* @__PURE__ */ new WeakMap();
	get length() {
		return this.map.size;
	}
	push(value) {
		const sn = ++this.sn;
		this.map.set(sn, value);
		this.weak.set(value, sn);
		return () => this.map.delete(sn);
	}
	delete(value) {
		const sn = this.weak.get(value);
		if (!sn) return false;
		return this.map.delete(sn);
	}
	clear() {
		const values = [...this.map.values()];
		this.map.clear();
		return values.reverse();
	}
	[Symbol.iterator]() {
		return this.map.values();
	}
	[Symbol.for("nodejs.util.inspect.custom")]() {
		return [...this];
	}
};
/** Shared symbols used to avoid public property-name collisions. */
const symbols = {
	shadow: Symbol.for("cordis.shadow"),
	receiver: Symbol.for("cordis.receiver"),
	original: Symbol.for("cordis.original"),
	metadata: Symbol.for("cordis.metadata"),
	initHooks: Symbol.for("cordis.initHooks"),
	checkProto: Symbol.for("cordis.checkProto"),
	effect: Symbol.for("cordis.effect"),
	filter: Symbol.for("cordis.filter"),
	isolate: Symbol.for("cordis.isolate"),
	intercept: Symbol.for("cordis.intercept"),
	init: Symbol.for("cordis.init"),
	check: Symbol.for("cordis.check"),
	config: Symbol.for("cordis.config"),
	invoke: Symbol.for("cordis.invoke"),
	extend: Symbol.for("cordis.extend"),
	tracker: Symbol.for("cordis.tracker"),
	resolveConfig: Symbol.for("cordis.resolveConfig")
};
const GeneratorFunction = function* () {}.constructor;
const AsyncGeneratorFunction = async function* () {}.constructor;
/** Return true when a plugin callback should be constructed with `new`. */
function isConstructor(func) {
	if (!func.prototype) return false;
	if (func instanceof GeneratorFunction) return false;
	if (AsyncGeneratorFunction !== Function && func instanceof AsyncGeneratorFunction) return false;
	return true;
}
/** Merge two prototype chains while preserving descriptors from `proto1`. */
function joinPrototype(proto1, proto2) {
	if (proto1 === Object.prototype) return proto2;
	const result = Object.create(joinPrototype(Object.getPrototypeOf(proto1), proto2));
	for (const key of Reflect.ownKeys(proto1)) Object.defineProperty(result, key, Object.getOwnPropertyDescriptor(proto1, key));
	return result;
}
/** Return true for non-null objects and functions. */
function isObject(value) {
	return value && (typeof value === "object" || typeof value === "function");
}
/** Find a property descriptor by walking an object's prototype chain. */
function getPropertyDescriptor(target, prop) {
	let proto = target;
	while (proto) {
		const desc = Reflect.getOwnPropertyDescriptor(proto, prop);
		if (desc) return desc;
		proto = Object.getPrototypeOf(proto);
	}
}
/** Wrap services/functions so method calls see the caller's active context. */
function getTraceable(ctx, value) {
	if (!isObject(value)) return value;
	if (Object.hasOwn(value, symbols.shadow)) return Object.getPrototypeOf(value);
	const tracker = value[symbols.tracker];
	if (!tracker) return value;
	return createTraceable(ctx, value, tracker);
}
/** Return a proxy that overlays readonly or writable properties onto a target. */
function withProps(target, props) {
	if (!props) return target;
	return new Proxy(target, {
		get: (target, prop, receiver) => {
			if (prop in props && prop !== "constructor") return Reflect.get(props, prop, receiver);
			return Reflect.get(target, prop, receiver);
		},
		set: (target, prop, value, receiver) => {
			if (prop in props && prop !== "constructor") return Reflect.set(props, prop, value, receiver);
			return Reflect.set(target, prop, value, receiver);
		}
	});
}
function withProp(target, prop, value) {
	return withProps(target, Object.defineProperty(Object.create(null), prop, {
		value,
		writable: false
	}));
}
function createShadow(ctx, target, property, receiver) {
	if (!property) return receiver;
	const origin = Reflect.getOwnPropertyDescriptor(target, property)?.value;
	if (!origin) return receiver;
	return withProp(receiver, property, ctx.extend({ [symbols.shadow]: origin }));
}
function createShadowMethod(ctx, value, outer, shadow) {
	return new Proxy(value, { apply: (target, thisArg, args) => {
		if (thisArg === outer) thisArg = shadow;
		return getTraceable(ctx, Reflect.apply(target, thisArg, args));
	} });
}
function createTraceable(ctx, value, tracker) {
	if (ctx[symbols.shadow] && !tracker.noShadow) ctx = Object.getPrototypeOf(ctx);
	const proxy = new Proxy(value, {
		get: (target, prop, receiver) => {
			if (prop === symbols.original) return target;
			if (prop === tracker.property) return ctx;
			if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);
			if (tracker.associate && ctx.reflect.props[`${tracker.associate}.${prop}`]) return Reflect.get(ctx, `${tracker.associate}.${prop}`, withProp(ctx, symbols.receiver, receiver));
			let shadow, innerValue;
			const desc = getPropertyDescriptor(target, prop);
			if (desc && "value" in desc) innerValue = desc.value;
			else {
				shadow = createShadow(ctx, target, tracker.property, receiver);
				innerValue = Reflect.get(target, prop, shadow);
			}
			const innerTracker = innerValue?.[symbols.tracker];
			if (innerTracker) return createTraceable(ctx, innerValue, innerTracker);
			else if (!tracker.noShadow && typeof innerValue === "function") {
				shadow ??= createShadow(ctx, target, tracker.property, receiver);
				return createShadowMethod(ctx, innerValue, receiver, shadow);
			} else return innerValue;
		},
		set: (target, prop, value, receiver) => {
			if (prop === symbols.original) return false;
			if (prop === tracker.property) return false;
			if (typeof prop === "symbol") return Reflect.set(target, prop, value, receiver);
			if (tracker.associate && ctx.reflect.props[`${tracker.associate}.${prop}`]) return Reflect.set(ctx, `${tracker.associate}.${prop}`, value, withProp(ctx, symbols.receiver, receiver));
			const shadow = createShadow(ctx, target, tracker.property, receiver);
			return Reflect.set(target, prop, value, shadow);
		},
		apply: (target, thisArg, args) => {
			return applyTraceable(proxy, target, thisArg, args);
		}
	});
	return proxy;
}
function applyTraceable(proxy, value, thisArg, args) {
	if (!value[symbols.invoke]) return Reflect.apply(value, thisArg, args);
	return value[symbols.invoke].apply(proxy, args);
}
/** Create a callable service object that dispatches through `symbols.invoke`. */
function createCallable(name, proto, tracker) {
	const self = function(...args) {
		return applyTraceable(createTraceable(self["ctx"], self, tracker), self, this, args);
	};
	defineProperty(self, "name", name);
	return Object.setPrototypeOf(self, proto);
}
function handleError(info, reason, getOuterStack) {
	const innerLines = info.error.stack.split("\n");
	if (typeof reason?.stack !== "string") {
		const outerError = new Error(reason);
		const lines = outerError.stack.split("\n");
		lines.splice(1, Infinity, ...getOuterStack());
		outerError.stack = lines.join("\n");
		throw outerError;
	}
	const lines = reason.stack.split("\n");
	let index = lines.indexOf(innerLines[2]);
	if (index === -1) throw reason;
	index -= info.offset;
	while (index > 0) {
		if (!lines[index - 1].endsWith(" (<anonymous>)")) break;
		index -= 1;
	}
	lines.splice(index, Infinity, ...getOuterStack());
	reason.stack = lines.join("\n");
	throw reason;
}
/** Run a callback and splice outer call-site frames into thrown async errors. */
function composeError(callback, getOuterStack = buildOuterStack()) {
	const info = {
		offset: 1,
		error: /* @__PURE__ */ new Error()
	};
	try {
		const result = callback(info);
		if (isObject(result) && "then" in result) return result.then(void 0, (reason) => handleError(info, reason, getOuterStack));
		else return result;
	} catch (reason) {
		handleError(info, reason, getOuterStack);
	}
}
/** Capture a lazy stack-frame supplier for later error composition. */
function buildOuterStack(offset = 0) {
	const outerError = /* @__PURE__ */ new Error();
	return () => outerError.stack.split("\n").slice(3 + offset);
}
/**
* Return whether an event result should stop a bail-style dispatch.
*
* @param value — a listener's return value.
* @returns `true` unless `value` is `null`, `false`, or `undefined`.
*/
function isBailed(value) {
	return value !== null && value !== false && value !== void 0;
}
/**
* Event bus installed as `ctx.events` and mixed into every context.
*
* The service supports concurrent, synchronous, serial, bail, and waterfall
* dispatch and automatically disposes listeners with their owning fiber.
*/
var EventsService = class {
	ctx;
	_hooks = {};
	constructor(ctx) {
		this.ctx = ctx;
		defineProperty(this, symbols.tracker, {
			property: "ctx",
			noShadow: true
		});
		this.on("internal/listener", function(name, listener, options) {
			if (name === "internal/update" && !options.global) return (this.fiber._hooks["internal/update"] ??= new DisposableList())[options.prepend ? "unshift" : "push"](listener);
		});
		this.on("internal/update", function(config, noSave, next) {
			const cbs = [...this._hooks["internal/update"] || []];
			const _next = () => {
				return (cbs.shift() ?? next).call(this, config, noSave, _next);
			};
			return _next();
		}, {
			global: true,
			prepend: true
		});
	}
	/**
	* Resolve listeners for one dispatch and apply context filtering.
	*
	* @param type — the dispatch mode, reported on `internal/dispatch`.
	* @param args — the raw dispatch arguments; consumed up to the event name.
	* @returns the matching listener callbacks, bound to the dispatch `this`.
	*/
	dispatch(type, args) {
		const thisArg = typeof args[0] === "object" || typeof args[0] === "function" ? args.shift() : null;
		const name = args.shift();
		if (!name.startsWith("internal/")) this.emit("internal/dispatch", type, name, args, thisArg);
		const filter = thisArg?.[Context.filter];
		return (this._hooks[name] || []).filter((hook) => hook.global || !filter || filter.call(thisArg, hook.ctx)).map((hook) => hook.callback.bind(thisArg));
	}
	/**
	* Run listeners concurrently and wait for all of them.
	*
	* @param args — optional `this`, the event name, then listener arguments.
	* @returns a promise resolving once every listener has settled.
	*/
	async parallel(...args) {
		const errors = (await Promise.allSettled(this.dispatch("emit", args).map(async (cb) => cb(...args)))).filter((result) => result.status === "rejected");
		if (errors.length) throw new AggregateError(errors.map((error) => error.reason));
	}
	/**
	* Run listeners synchronously without waiting for returned promises.
	*
	* @param args — optional `this`, the event name, then listener arguments.
	*/
	emit(...args) {
		this.dispatch("emit", args).map((cb) => cb(...args));
	}
	/**
	* Run listeners in order, awaiting each, until one returns a bail value.
	*
	* @param args — optional `this`, the event name, then listener arguments.
	* @returns the first bail value (see {@link isBailed}), if any.
	*/
	async serial(...args) {
		for (const cb of this.dispatch("serial", args)) {
			const result = await cb(...args);
			if (isBailed(result)) return result;
		}
	}
	/**
	* Run listeners synchronously until one returns a bail value.
	*
	* @param args — optional `this`, the event name, then listener arguments.
	* @returns the first bail value (see {@link isBailed}), if any.
	*/
	bail(...args) {
		for (const cb of this.dispatch("bail", args)) {
			const result = cb(...args);
			if (isBailed(result)) return result;
		}
	}
	/**
	* Compose listeners around the final `next` callback.
	*
	* The last dispatch argument is treated as the innermost `next`. Listeners
	* run outermost-first; a listener that does not call `next()` vetoes the
	* rest of the chain, including the built-in behavior.
	*
	* @param args — optional `this`, the event name, listener arguments, then `next`.
	* @returns the outermost listener's return value.
	*/
	waterfall(...args) {
		const cbs = this.dispatch("waterfall", args);
		const inner = args.pop();
		const next = () => {
			return (cbs.shift() ?? inner)(...args);
		};
		args.push(next);
		return next();
	}
	/**
	* Store a listener record as an effect on the current fiber.
	*
	* @param label — effect label shown in fiber diagnostics.
	* @param hooks — the listener list for one event.
	* @param callback — the listener to store.
	* @param options — placement and filtering options.
	* @returns a disposer that unregisters the listener.
	*/
	register(label, hooks, callback, options) {
		const method = options.prepend ? "unshift" : "push";
		return this.ctx.fiber.effect(() => {
			hooks[method]({
				ctx: this.ctx,
				callback,
				...options
			});
			return () => this.unregister(hooks, callback);
		}, label);
	}
	/**
	* Remove a stored listener record.
	*
	* @param hooks — the listener list for one event.
	* @param callback — the listener to remove.
	* @returns `true` if the listener was found and removed.
	*/
	unregister(hooks, callback) {
		const index = hooks.findIndex((hook) => hook.callback === callback);
		if (index >= 0) {
			hooks.splice(index, 1);
			return true;
		}
	}
	/**
	* Register an event listener owned by the current fiber.
	*
	* The listener is removed automatically when the fiber unloads. Throws
	* `CordisError('INACTIVE_EFFECT')` if the fiber is already disposed.
	*
	* @param name — the event name to listen for.
	* @param listener — called with the dispatch arguments.
	* @param options — listener options; a boolean is shorthand for `prepend`.
	* @returns a disposer removing the listener; `true` if it was still registered.
	*/
	on(name, listener, options) {
		if (typeof options !== "object") options = { prepend: options };
		this.ctx.fiber.assertActive();
		listener = this.ctx.reflect.bind(listener);
		const result = this.bail(this.ctx, "internal/listener", name, listener, options);
		if (result) return result;
		const hooks = this._hooks[name] ||= [];
		const label = `ctx.on(${typeof name === "string" ? JSON.stringify(name) : name.toString()})`;
		return this.register(label, hooks, listener, options);
	}
	/**
	* Register an event listener that disposes itself after the first call.
	*
	* @param name — the event name to listen for.
	* @param listener — called at most once with the dispatch arguments.
	* @param options — listener options; a boolean is shorthand for `prepend`.
	* @returns a disposer removing the listener; `true` if it was still registered.
	*/
	once(name, listener, options) {
		const dispose = this.on(name, function(...args) {
			dispose();
			return listener.apply(this, args);
		}, options);
		return dispose;
	}
};
/** Built-in placeholder formatters used by `Logger.format()`. */
const defaultFormatters = {
	s: (value) => String(value),
	d: (value) => Math.trunc(Number(value)),
	i: (value) => Math.trunc(Number(value)),
	f: (value) => Number(value),
	o: (value) => JSON.stringify(value),
	O: (value) => JSON.stringify(value),
	c: () => "",
	C: (value, exporter, message) => {
		return Logger.color(exporter, Logger.code(message.name, exporter.colors), value);
	}
};
function isAggregateError(error) {
	return error instanceof Error && Array.isArray(error["errors"]);
}
/** Logger facade for one named subsystem. */
var Logger = class {
	service;
	static color(exporter, code, value, decoration = "") {
		if (!exporter.colors) return "" + value;
		return `\u001b[3${code < 8 ? code : "8;5;" + code}${exporter.colors >= 2 ? decoration : ""}m${value}\u001b[0m`;
	}
	static code(name, level) {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = (hash << 3) - hash + name.charCodeAt(i) + 13;
			hash |= 0;
		}
		const colors = !level ? [] : level >= 2 ? c256 : c16;
		return colors[Math.abs(hash) % colors.length];
	}
	static format(exporter, message) {
		const args = message.args.slice();
		if (args[0] instanceof Error) {
			args[0] = args[0].stack || args[0].message;
			args.unshift("%s");
		} else if (typeof args[0] !== "string") args.unshift("%o");
		let format = args.shift();
		format = format.replace(/%([a-zA-Z%])/g, (match, char) => {
			if (match === "%%") return "%";
			const formatter = exporter.formatters?.[char] ?? defaultFormatters[char];
			if (typeof formatter === "function") return formatter(args.shift(), exporter, message);
			return match;
		});
		const oFormatter = exporter.formatters?.o ?? defaultFormatters.o;
		for (let arg of args) {
			if (typeof arg === "object" && arg) arg = oFormatter(arg, exporter, message);
			format += " " + arg;
		}
		const { maxLength = 10240 } = exporter;
		return format.split(/\r?\n/g).map((line) => {
			return line.slice(0, maxLength) + (line.length > maxLength ? "..." : "");
		}).join("\n");
	}
	constructor(options, service) {
		this.service = service;
		Object.assign(this, options);
		this.error = this._method("error", 0);
		this.info = this._method("info", 1);
		this.warn = this._method("warn", 2);
		this.debug = this._method("debug", 3);
	}
	_method(type, level) {
		return (...args) => {
			if (args.length === 1 && args[0] instanceof Error) {
				if (args[0].cause) this[type](args[0].cause);
				else if (isAggregateError(args[0])) {
					args[0].errors.forEach((error) => this[type](error));
					return;
				}
			}
			const sn = ++this.service._snMessage;
			const ts = Date.now();
			for (const exporter of this.service.exporters.values()) {
				if ((exporter.levels?.[this.name] ?? exporter.levels?.default ?? this.level ?? 1) < level) continue;
				const message = {
					sn,
					ts,
					type,
					level,
					name: this.name,
					...this.meta,
					args
				};
				exporter.export(message);
			}
		};
	}
};
/** ANSI 16-color palette indexes used for logger name coloring. */
const c16 = [
	6,
	2,
	3,
	4,
	5,
	1
];
/** ANSI 256-color palette indexes used for logger name coloring. */
const c256 = [
	20,
	21,
	26,
	27,
	32,
	33,
	38,
	39,
	40,
	41,
	42,
	43,
	44,
	45,
	56,
	57,
	62,
	63,
	68,
	69,
	74,
	75,
	76,
	77,
	78,
	79,
	80,
	81,
	92,
	93,
	98,
	99,
	112,
	113,
	129,
	134,
	135,
	148,
	149,
	160,
	161,
	162,
	163,
	164,
	165,
	166,
	167,
	168,
	169,
	170,
	171,
	172,
	173,
	178,
	179,
	184,
	185,
	196,
	197,
	198,
	199,
	200,
	201,
	202,
	203,
	204,
	205,
	206,
	207,
	208,
	209,
	214,
	215,
	220,
	221
];
/**
* Built-in logging service.
*
* Call `ctx.logger()` to create a named logger, or call `ctx.logger.info()`
* directly to log with the current fiber-derived name.
*/
var LoggerService = class LoggerService {
	bufferSize = 1e3;
	buffer = [];
	ctx;
	_snMessage = 0;
	_snExporter = 0;
	exporters = /* @__PURE__ */ new Map();
	constructor(ctx) {
		const tracker = {
			property: "ctx",
			noShadow: true
		};
		const self = createCallable("logger", joinPrototype(Object.getPrototypeOf(this), Function.prototype), tracker);
		Object.assign(self, this);
		self.ctx = ctx;
		defineProperty(self, symbols.tracker, tracker);
		self.exporter({
			colors: 3,
			export: (message) => {
				self.buffer.push(message);
				if (self.buffer.length > self.bufferSize) self.buffer = self.buffer.slice(-self.bufferSize);
			}
		});
		return self;
	}
	/**
	* Register an exporter and dispose it with the current fiber.
	*
	* @param exporter — the sink that receives structured log messages.
	* @returns a disposer that removes the exporter.
	*/
	exporter(exporter) {
		return this.ctx.effect(() => {
			const id = ++this._snExporter;
			this.exporters.set(id, exporter);
			return () => this.exporters.delete(id);
		}, "ctx.logger.exporter()");
	}
	_resolveConfig() {
		let intercept = this.ctx[symbols.intercept];
		const configs = [];
		while ("logger" in intercept) {
			if (Object.hasOwn(intercept, "logger")) configs.unshift(intercept["logger"]);
			intercept = Object.getPrototypeOf(intercept);
		}
		return Object.assign({}, ...configs);
	}
	[symbols.invoke](name) {
		const config = this._resolveConfig();
		const fiber = (this.ctx[symbols.shadow] ?? this.ctx).fiber;
		name ??= config.name;
		name ??= hyphenate(fiber.name);
		return new Logger({
			name,
			level: config.level,
			meta: { fiber: new WeakRef(fiber) }
		}, this);
	}
	static {
		for (const type of [
			"error",
			"info",
			"warn",
			"debug"
		]) LoggerService.prototype[type] = function(...args) {
			return this()[type](...args);
		};
	}
};
function enhanceError(error) {
	const lines = error.stack.split("\n");
	lines.splice(0, 2, `Error: ${error.message}`);
	error.stack = lines.join("\n");
	return error;
}
const RESERVED_WORDS = ["prototype", "then"];
function isSpecialProperty(prop) {
	return typeof prop === "symbol" || RESERVED_WORDS.includes(prop) || parseInt(prop).toString() === prop || prop.startsWith("_");
}
/**
* Reflection and service-resolution layer installed as `ctx.reflect`.
*
* This service powers the context proxy, service registration, accessors, and
* the mixins that expose core service methods directly on `ctx`.
*/
var ReflectService = class {
	ctx;
	/** Proxy traps implementing service resolution for every context object. */
	static handler = {
		get: (target, prop, ctx) => {
			if (isSpecialProperty(prop)) return Reflect.get(target, prop, ctx);
			if (Reflect.has(target, prop)) return getTraceable(ctx, Reflect.get(target, prop, ctx));
			const error = /* @__PURE__ */ new Error(`cannot get property "${prop}" without inject`);
			try {
				const def = target.reflect.props[prop];
				if (def?.type === "accessor") return def.get.call(ctx, ctx[symbols.receiver], error);
				if (!ctx.fiber.runtime) return ctx.reflect.get(prop, false);
				return ctx.events.waterfall("internal/get", ctx, prop, error, () => {
					const key = target[symbols.isolate][prop];
					let fiber = (ctx[symbols.shadow] ?? ctx).fiber;
					while (true) {
						const impl = fiber.store?.[prop];
						if (impl) return getTraceable(ctx, impl.value);
						if (prop in fiber.inject) {
							error.message = `cannot get required service "${prop}" in inactive context`;
							throw error;
						}
						if (!fiber.runtime) throw error;
						if (fiber.parent[symbols.isolate][prop] !== key) throw error;
						fiber = fiber.parent.fiber;
					}
				});
			} catch (e) {
				throw e === error ? enhanceError(e) : e;
			}
		},
		set: (target, prop, value, ctx) => {
			if (isSpecialProperty(prop)) return Reflect.set(target, prop, value, ctx);
			const error = /* @__PURE__ */ new Error(`cannot set property "${prop}" without provide`);
			const def = target.reflect.props[prop];
			if (!def) {
				if (!ctx.fiber.runtime) return Reflect.set(target, prop, value, ctx);
				throw enhanceError(error);
			}
			try {
				if (def.type === "accessor") {
					if (!def.set) return false;
					return def.set.call(ctx, value, ctx[symbols.receiver], error);
				}
				return ctx.events.waterfall("internal/set", ctx, prop, value, error, () => {
					return ctx.reflect.set(prop, value, error);
				});
			} catch (e) {
				throw e === error ? enhanceError(e) : e;
			}
		},
		has: (target, prop) => {
			if (isSpecialProperty(prop)) return Reflect.has(target, prop);
			if (Reflect.has(target, prop)) return true;
			return !!target.reflect.props[prop];
		}
	};
	/** Service implementations, keyed by isolation label. */
	store = Object.create(null);
	/** Declared context properties (services and accessors), by name. */
	props = Object.create(null);
	constructor(ctx) {
		this.ctx = ctx;
		defineProperty(this, symbols.tracker, {
			property: "ctx",
			noShadow: true
		});
		this.mixin("reflect", [
			"get",
			"set",
			"provide",
			"accessor",
			"mixin"
		]);
		this.mixin("fiber", ["runtime", "effect"]);
		this.mixin("registry", ["inject", "plugin"]);
		this.mixin("events", [
			"on",
			"once",
			"parallel",
			"emit",
			"serial",
			"bail",
			"waterfall"
		]);
	}
	/**
	* Read a service from the store without the inject requirement.
	*
	* @param name — the service name.
	* @param strict — when `true`, only return implementations whose providing
	* fiber is currently active.
	* @returns the service value, or `undefined` when not (yet) provided.
	*/
	get(name, strict = true) {
		return getTraceable(this.ctx, this._getImpl(name, strict)?.value);
	}
	_getImpl(name, strict = true) {
		const key = this.ctx[symbols.isolate][name];
		const impl = key && this.store[key];
		if (!impl) return;
		if (strict && impl.fiber.state !== 2) return;
		return impl;
	}
	/**
	* Overwrite a provided service's value.
	*
	* @param name — the service name.
	* @param value — the new service value.
	* @param error — carrier for the caller stack in diagnostics.
	* @returns `true` on success.
	* @throws when `name` was never provided, or was provided by another fiber.
	*/
	set(name, value, error) {
		const key = this.ctx[symbols.isolate][name];
		const impl = this.store[key];
		if (!impl) throw new Error(`cannot set property "${name}" without provide`);
		if (impl.fiber !== this.ctx.fiber) throw new Error(`cannot set property "${name}" in multiple fibers`);
		impl.value = value;
		return true;
	}
	/**
	* Register a service implementation owned by the current fiber.
	*
	* See the `ctx.provide()` overload above for the full contract.
	*
	* @param name — the service name.
	* @param value — the service value.
	* @param check — optional availability predicate for dependents.
	* @returns a disposer that unregisters the service.
	*/
	provide(name, value, check) {
		return this.ctx.fiber.effect(() => {
			if (!this.props[name]) this.props[name] ??= { type: "service" };
			else if (this.props[name].type !== "service") throw new Error(`property "${name}" is already declared as ${this.props[name].type}`);
			this.props[name] = { type: "service" };
			this.ctx.root[symbols.isolate][name] ??= Symbol(name);
			const key = this.ctx[symbols.isolate][name];
			const impl = {
				name,
				value,
				fiber: this.ctx.fiber,
				check
			};
			if (this.store[key]) throw new Error(`service "${name}" has been registered at <${this.store[key].fiber.name}>`);
			this.store[key] = impl;
			this.ctx.fiber.store[name] = impl;
			if (this.ctx.fiber.state === 2) this.notify([name]);
			return async () => {
				delete this.store[key];
				const fibers = this.notify([name]);
				await Promise.allSettled(fibers.map((fiber) => fiber.await()));
				delete this.ctx.fiber.store[name];
			};
		}, `ctx.provide(${JSON.stringify(name)})`);
	}
	/**
	* Re-evaluate every fiber that requires one of the given services.
	*
	* @param names — the service names that changed.
	* @param filter — restricts notification to matching isolation scopes.
	* @returns the fibers whose dependency state was refreshed.
	*/
	notify(names, filter = (ctx, name) => ctx[symbols.isolate][name] === this.ctx[symbols.isolate][name]) {
		const fibers = [];
		for (const runtime of this.ctx.registry.values()) for (const fiber of runtime.fibers) {
			let hasUpdate = false;
			for (const name of names) {
				if (!(name in fiber.inject)) continue;
				if (!filter(fiber.ctx, name)) continue;
				hasUpdate = true;
				fiber._checkImpl(name);
			}
			if (!hasUpdate) continue;
			fiber._refresh();
			fibers.push(fiber);
		}
		for (const name of names) {
			const self = Object.create(this.ctx);
			self[symbols.filter] = (target) => filter(target, name);
			this.ctx.events.emit(self, "internal/service", name, this._getImpl(name, false)?.value);
		}
		return fibers;
	}
	/**
	* Define a computed context property backed by get/set hooks.
	*
	* @param name — the context property name.
	* @param options — the `get` hook and optional `set` hook.
	* @returns a disposer that removes the accessor.
	*/
	accessor(name, options) {
		return this.ctx.fiber.effect(() => {
			if (name in this.props) throw new Error(`property "${name}" is already declared as ${this.props[name].type}`);
			this.props[name] = {
				type: "accessor",
				...options
			};
			return () => delete this.props[name];
		}, `ctx.accessor(${JSON.stringify(name)})`);
	}
	/**
	* Expose selected members of a service directly on `ctx`.
	*
	* See the `ctx.mixin()` overload above for the full contract.
	*
	* @param source — a context property name or a source object.
	* @param mixins — keys to forward, or a source-key → ctx-key map.
	* @returns a disposer that removes all created accessors.
	*/
	mixin(source, mixins) {
		const self = this;
		return this.ctx.fiber.effect(function* () {
			const entries = Array.isArray(mixins) ? mixins.map((key) => [key, key]) : Object.entries(mixins);
			const getTarget = (ctx, error) => {
				return ctx[source];
			};
			for (const [key, value] of entries) yield self.accessor(value, {
				get(receiver, error) {
					const service = getTarget(this, error);
					if (isNullable(service)) return service;
					const mixin = receiver ? withProps(receiver, service) : service;
					const value = Reflect.get(service, key, mixin);
					if (typeof value !== "function") return value;
					return value.bind(mixin ?? service);
				},
				set(value, receiver, error) {
					const service = getTarget(this, error);
					const mixin = receiver ? withProps(receiver, service) : service;
					return Reflect.set(service, key, value, mixin);
				}
			});
		}, `ctx.mixin(${JSON.stringify(source)})`);
	}
	/**
	* Attach this context's tracing wrapper to a value.
	*
	* @param value — the value to wrap.
	* @returns the traceable wrapper (or the value itself when not applicable).
	*/
	trace(value) {
		return getTraceable(this.ctx, value);
	}
	/**
	* Wrap a callback so calls trace `this` and arguments to this context.
	*
	* @param callback — the function to wrap.
	* @returns a proxy delegating to `callback` with traced values.
	*/
	bind(callback) {
		return new Proxy(callback, {
			apply: (target, thisArg, args) => {
				return Reflect.apply(target, this.trace(thisArg), args.map((arg) => this.trace(arg)));
			},
			construct: (target, args, newTarget) => {
				return Reflect.construct(target, args.map((arg) => this.trace(arg)), newTarget);
			}
		});
	}
};
const kValidationError = Symbol.for("ValidationError");
/** Error raised when plugin configuration fails standard-schema validation. */
var ValidationError = class extends TypeError {
	name = "ValidationError";
	/**
	* Build the aggregated message from schema issues.
	*
	* @param issues — the standard-schema issues, one message line each.
	*/
	constructor(issues) {
		super(`invalid config:\n` + issues.map((issue) => {
			if (issue.path) return `  - ${issue.message} (at ${issue.path.join(".")})`;
			else return `  - ${issue.message}`;
		}).join("\n"));
	}
};
Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
/**
* Validate and normalize config for a plugin runtime before it starts.
*
* @param runtime — the plugin runtime whose `Config` schema to apply.
* @param config — the raw user config.
* @returns the validated config, or `config` unchanged if the runtime has no schema.
* @throws {ValidationError} when validation reports issues.
*/
function resolveConfig(runtime, config) {
	if (!runtime.Config) return config;
	const result = runtime.Config["~standard"].validate(config);
	if ("then" in result) throw new TypeError("Async config validation is not supported");
	if (result.issues) throw new ValidationError(result.issues);
	else return result.value;
}
const effectInertia = /* @__PURE__ */ new WeakMap();
function runDisposable(dispose) {
	const result = dispose();
	return effectInertia.get(dispose)?.() ?? result;
}
/** Notify plugin teardown without allowing one observer to break ownership cleanup. */
function emitPluginDisposed(context, fiber) {
	const args = ["internal/plugin", fiber];
	let callbacks;
	try {
		callbacks = context.events.dispatch("emit", args);
	} catch (error) {
		context.logger.error(error);
		return;
	}
	for (const callback of callbacks) try {
		const returned = callback(...args);
		Promise.resolve(returned).catch((error) => context.logger.error(error));
	} catch (error) {
		context.logger.error(error);
	}
}
/** Framework error with a stable machine-readable code. */
var CordisError = class CordisError extends Error {
	code;
	/**
	* @param code — the stable error code; also the default message.
	* @param message — optional human-readable override.
	*/
	constructor(code, message) {
		super(message ?? CordisError.Code[code]);
		this.code = code;
	}
};
/** Cordis error code definitions. */
(function(CordisError) {
	CordisError.Code = { INACTIVE_EFFECT: "cannot create effect on inactive context" };
})(CordisError || (CordisError = {}));
const INACTIVE = "__INACTIVE__";
/**
* Runtime instance of one plugin application.
*
* A fiber tracks dependency state, validated config, lifecycle effects, and
* cleanup for the plugin context returned by `ctx.plugin()`.
*/
var Fiber = class {
	parent;
	inject;
	runtime;
	/** Unique id within the registry; 0 for the root fiber, `null` once disposed. */
	uid;
	/** The context this fiber's plugin runs in (extends the parent context). */
	ctx;
	/** The validated plugin config (updated by `update()`). */
	config;
	/** The raw plugin config, re-resolved before each activation. */
	_config;
	/** Current lifecycle state; transitions emit `internal/status`. */
	state = 0;
	/** Dispose this fiber: unload the plugin, then settle once cleanup finished. */
	dispose;
	/** Snapshot of required service implementations while loaded; `undefined` otherwise. */
	store;
	/** The in-flight load/unload transition, if one is currently running. */
	inertia;
	_hooks = Object.create(null);
	_disposables = new DisposableList();
	context;
	_error;
	_runner;
	_store = Object.create(null);
	/**
	* Create a fiber. Plugin authors normally obtain fibers from `ctx.plugin()`
	* rather than constructing them directly.
	*
	* @param parent — the context the plugin was loaded from.
	* @param config — raw config, validated against the runtime's schema.
	* @param inject — resolved dependency map (service name → intercept config).
	* @param runtime — the shared plugin runtime, or `null` for the root fiber.
	* @param getOuterStack — captures the caller stack for effect diagnostics.
	*/
	constructor(parent, config, inject, runtime, getOuterStack) {
		this.parent = parent;
		this.inject = inject;
		this.runtime = runtime;
		this._config = config;
		const collect = (dispose) => {
			this._disposables.push(dispose);
		};
		if (runtime) {
			this.uid = parent.registry.counter;
			this.ctx = this.context = parent.extend({ fiber: this });
			const injectEntries = Object.entries(this.inject);
			if (injectEntries.length) {
				this.ctx[Context.intercept] = Object.create(parent[Context.intercept]);
				for (const [name, config] of injectEntries) {
					if (isNullable(config)) continue;
					this.ctx[Context.intercept][name] = config;
				}
			}
			this._runner = {
				epoch: INACTIVE,
				getOuterStack,
				execute: function() {
					if (isConstructor(runtime.callback)) {
						const instance = new runtime.callback(this.ctx, this.config);
						for (const hook of instance?.[symbols.initHooks] ?? []) hook();
						return instance?.[symbols.init]?.();
					} else return runtime.callback(this.ctx, this.config);
				},
				collect
			};
			this.dispose = parent.fiber.effect(() => {
				const remove = runtime.fibers.push(this);
				return async () => {
					this.uid = null;
					emitPluginDisposed(this.context, this);
					if (this.ctx.registry.has(runtime.callback)) {
						remove();
						if (!runtime.fibers.length) this.ctx.registry.delete(runtime.callback);
					}
					this._setEpoch(INACTIVE);
					if (!this.inertia) this._updateState(() => {
						this.inertia = this._unload();
						return 5;
					});
					while (this.inertia) await this.inertia;
				};
			}, "ctx.plugin()");
			try {
				this.context.emit("internal/plugin", this);
			} catch (error) {
				Promise.resolve(this.dispose()).catch((reason) => this.ctx.logger.error(reason));
				throw error;
			}
			if (this.uid !== null && parent.fiber.state !== 5) {
				for (const name of Object.keys(this.inject)) this._checkImpl(name);
				this._refresh();
			}
		} else {
			this.uid = 0;
			this.ctx = this.context = parent;
			this.state = 2;
			this.store = Object.create(null);
			this._runner = {
				epoch: "",
				getOuterStack,
				execute: () => {},
				collect
			};
			this.dispose = () => this.restart();
		}
	}
	/** The plugin's display name, inherited from the nearest named ancestor, else `'root'`. */
	get name() {
		let fiber = this;
		do {
			if (fiber.runtime?.name) return fiber.runtime.name;
			fiber = fiber.parent.fiber;
		} while (fiber !== fiber.parent.fiber);
		return "root";
	}
	/**
	* Throw if the fiber has already been disposed.
	*
	* @returns nothing when the fiber is still active.
	* @throws {CordisError} `INACTIVE_EFFECT` when the fiber's uid has been cleared.
	*/
	assertActive() {
		if (this.uid !== null) return;
		throw new CordisError("INACTIVE_EFFECT");
	}
	_execute(runner) {
		const oldEpoch = runner.epoch;
		return composeError((info) => {
			const safeCollect = (dispose) => {
				if (typeof dispose === "function") runner.collect(dispose);
				else if (!isNullable(dispose)) throw new TypeError("Invalid effect");
			};
			const effect = runner.execute.call(this);
			if (typeof effect === "function") return runner.collect(effect);
			else if (isNullable(effect)) {} else if (!isObject(effect)) throw new TypeError("Invalid effect");
			else if ("then" in effect) return effect.then(safeCollect);
			else if (Symbol.iterator in effect) {
				info.error = /* @__PURE__ */ new Error();
				const iter = effect[Symbol.iterator]();
				while (true) {
					const result = iter.next();
					safeCollect(result.value);
					if (result.done) return;
				}
			} else if (Symbol.asyncIterator in effect) {
				const iter = effect[Symbol.asyncIterator]();
				return (async () => {
					await Promise.resolve();
					info.error = /* @__PURE__ */ new Error();
					while (true) {
						if (runner.epoch !== oldEpoch) return;
						const result = await iter.next();
						safeCollect(result.value);
						if (result.done) return;
					}
				})();
			} else throw new TypeError("Invalid effect");
		}, runner.getOuterStack);
	}
	effect(execute, label = "anonymous") {
		this.assertActive();
		if (this.state === 5) throw new CordisError("INACTIVE_EFFECT");
		const disposables = [];
		let disposing = false;
		let disposalTask;
		const dispose = () => {
			if (disposing) return disposalTask;
			disposing = true;
			let task;
			for (const disposable of disposables.splice(0).reverse()) if (task) task = task.then(() => runDisposable(disposable));
			else {
				const result = runDisposable(disposable);
				if (isObject(result) && "then" in result) task = result;
			}
			return disposalTask = task;
		};
		const meta = {
			label,
			children: []
		};
		const runner = {
			execute,
			epoch: true,
			collect: (dispose) => {
				disposables.push(dispose);
				this._disposables.delete(dispose);
				if (dispose[symbols.effect]) meta.children.push(dispose[symbols.effect]);
			},
			getOuterStack: buildOuterStack()
		};
		let task;
		let executing = true;
		let resolveSetup;
		let rejectSetup;
		let setupBarrier;
		let setupFailed = false;
		let inFlight;
		let removeWrapper = () => false;
		const waitForSetup = () => {
			setupBarrier ??= new Promise((resolve, reject) => {
				resolveSetup = resolve;
				rejectSetup = reject;
			});
			return setupBarrier;
		};
		const disposeAfter = (setup) => {
			return Promise.resolve(setup).then(() => dispose(), async (reason) => {
				await dispose();
				throw reason;
			});
		};
		const finalizeDisposal = (callback) => {
			let result;
			try {
				result = callback();
			} catch (error) {
				removeWrapper();
				throw error;
			}
			if (isObject(result) && "then" in result) {
				const pending = Promise.resolve(result).finally(() => {
					removeWrapper();
					if (inFlight === pending) inFlight = void 0;
				});
				return inFlight = pending;
			}
			removeWrapper();
			return result;
		};
		const wrapper = defineProperty(() => {
			if (!runner.epoch) return setupFailed ? inFlight : void 0;
			runner.epoch = false;
			return finalizeDisposal(() => {
				if (executing) return disposeAfter(waitForSetup());
				return task ? disposeAfter(task) : dispose();
			});
		}, symbols.effect, meta);
		effectInertia.set(wrapper, () => inFlight);
		removeWrapper = this._disposables.push(wrapper);
		try {
			task = this._execute(runner);
		} catch (reason) {
			executing = false;
			setupFailed = true;
			runner.epoch = false;
			let cleanup;
			try {
				cleanup = finalizeDisposal(dispose);
			} finally {
				rejectSetup?.(reason);
			}
			if (isObject(cleanup) && "then" in cleanup) cleanup.catch((error) => this.ctx.logger.error(error));
			throw reason;
		}
		executing = false;
		if (setupBarrier) Promise.resolve(task).then(resolveSetup, rejectSetup);
		task?.catch(() => {
			if (!runner.epoch) return dispose();
			return finalizeDisposal(dispose);
		}).catch((error) => this.ctx.logger.error(error));
		const disposeAsync = () => {
			if (!runner.epoch) return;
			runner.epoch = false;
			return finalizeDisposal(dispose);
		};
		wrapper.then = async (onFulfilled, onRejected) => {
			return Promise.resolve(task).then(() => disposeAsync).then(onFulfilled, onRejected);
		};
		return wrapper;
	}
	/**
	* Return metadata for currently registered effects.
	*
	* @returns one {@link EffectMeta} tree per labeled live effect.
	*/
	getEffects() {
		return [...this._disposables].map((dispose) => dispose[symbols.effect]).filter(Boolean);
	}
	_getState() {
		if (this.uid === null) return 4;
		if (this._error) return 3;
		if (this._runner.epoch !== INACTIVE) return 2;
		return 0;
	}
	_updateState(callback) {
		const oldState = this.state;
		this.state = callback() ?? this._getState();
		if (oldState === this.state) return;
		this.context.emit("internal/status", this, oldState);
		if (oldState !== 2 && this.state !== 2) return;
		for (const key of Reflect.ownKeys(this.ctx.reflect.store)) {
			const impl = this.ctx.reflect.store[key];
			if (impl.fiber !== this) continue;
			this.ctx.reflect.notify([impl.name]);
		}
	}
	_checkImpl(name) {
		const impl = this.ctx.reflect._getImpl(name, true);
		if (!impl) return delete this._store[name];
		try {
			if (impl.check && !impl.check.call(getTraceable(this.ctx, impl.value))) return delete this._store[name];
		} catch (error) {
			impl.fiber.ctx.logger.error(error);
			return delete this._store[name];
		}
		this._store[name] = impl;
	}
	_refresh() {
		let epoch = false;
		epoch = "";
		for (const name of Object.keys(this.inject)) {
			const impl = this._store[name];
			if (!impl) {
				epoch = INACTIVE;
				break;
			}
			epoch += ":" + impl.fiber.uid;
		}
		this._setEpoch(epoch);
	}
	_setEpoch(epoch) {
		const oldEpoch = this._runner.epoch;
		if (epoch === oldEpoch) return;
		this._runner.epoch = epoch;
		if (this.inertia) return;
		this._updateState(() => {
			if (epoch !== INACTIVE && oldEpoch === INACTIVE) {
				this.inertia = this._reload();
				return 1;
			} else {
				this.inertia = this._unload();
				return 5;
			}
		});
	}
	_resolveConfig(config) {
		config = this.context.waterfall(this, "internal/config", config, () => config);
		return this.runtime ? resolveConfig(this.runtime, config) : config;
	}
	async _reload() {
		this.store = { ...this._store };
		const oldEpoch = this._runner.epoch;
		try {
			await Promise.resolve();
			if (this._runner.epoch === oldEpoch) {
				this.config = this._resolveConfig(this._config);
				await this._execute(this._runner);
				this._error = void 0;
			}
		} catch (reason) {
			this.ctx.logger.error(reason);
			this._error = reason;
			this._runner.epoch = INACTIVE;
		}
		this._updateState(() => {
			if (this._runner.epoch === oldEpoch) this.inertia = void 0;
			else {
				this.inertia = this._unload();
				return 5;
			}
		});
	}
	async _unload() {
		await Promise.all(this._disposables.clear().map(async (dispose) => {
			try {
				await composeError(async (info) => {
					await Promise.resolve();
					info.error = /* @__PURE__ */ new Error();
					await runDisposable(dispose);
				}, this._runner.getOuterStack);
			} catch (reason) {
				this.ctx.logger.error(reason);
			}
		}));
		this.store = void 0;
		this._updateState(() => {
			if (this._runner.epoch === INACTIVE) this.inertia = void 0;
			else {
				this.inertia = this._reload();
				return 1;
			}
		});
	}
	/**
	* Wait for current lifecycle work and rethrow startup errors.
	*
	* @returns this fiber, once it has settled into a stable state.
	* @throws the config-validation or plugin-startup error, if any.
	*/
	async await() {
		while (this.inertia) await this.inertia;
		if (this._error) throw this._error;
		return this;
	}
	/**
	* Dispose and immediately reload this plugin with its current config.
	*
	* @returns a promise resolving once the reload settled.
	* @throws {CordisError} `INACTIVE_EFFECT` when the fiber is already disposed.
	*/
	async restart() {
		this.assertActive();
		this._setEpoch(INACTIVE);
		this._refresh();
		await this.await();
	}
	/**
	* Validate and apply new config, then restart the plugin.
	*
	* Runs the `internal/update` waterfall first, so update hooks (and HMR)
	* can veto or replace the restart.
	*
	* @param config — the new raw config; validated before anything restarts.
	* @param noSave — hint for persistence hooks not to write the change back.
	* @returns nothing; the restart runs behind the `internal/update` waterfall.
	* @throws {ValidationError} when the new config fails validation.
	*/
	update(config, noSave = false) {
		this.assertActive();
		this._config = config;
		if (this.state !== 2) {
			this._error = void 0;
			this._setEpoch(INACTIVE);
			this._refresh();
			return;
		}
		config = this._resolveConfig(config);
		this.context.waterfall(this, "internal/update", config, noSave, () => {
			this.config = config;
			this._error = void 0;
			return this.restart();
		});
	}
};
function isApplicable(object) {
	return object && typeof object === "object" && typeof object.apply === "function";
}
/**
* Decorator for declaring service dependencies on classes or class methods.
*
* On classes it contributes to the plugin's static `inject` map. On methods it
* delays the method call until the declared services are available.
*/
/**
* @param name — the required service name.
* @param config — optional intercept config applied for that service.
* @returns the class or method decorator.
*/
function Inject(name, config) {
	return function(value, decorator) {
		if (decorator.kind === "class") {
			if (!Object.hasOwn(value, "inject")) {
				defineProperty(value, "inject", Object.create(Object.getPrototypeOf(value).inject ?? null));
				defineProperty(value.inject, symbols.checkProto, true);
			}
			value.inject[name] = config;
		} else if (decorator.kind === "method") {
			const inject = (value[symbols.metadata] ??= {}).inject ??= Object.create(null);
			inject[name] = config;
			decorator.addInitializer(function() {
				const property = this[symbols.tracker]?.property;
				(this[symbols.initHooks] ??= []).push(() => {
					this.ctx.inject(inject, (ctx) => {
						return value.call(property ? withProps(this, { [property]: ctx }) : this);
					});
				});
			});
		} else throw new Error("@Inject() can only be used on class or class methods");
	};
}
/** Utilities for normalizing plugin dependency declarations. */
(function(Inject) {
	/**
	* Convert array/object/class-inherited inject metadata into a plain map.
	*
	* @param inject — the declaration to normalize; `null`/`undefined` add nothing.
	* @param result — the map to fill (service name → intercept config or `null`).
	* @returns `result`.
	*/
	function resolve(inject, result = Object.create(null)) {
		if (!inject) return result;
		if (Array.isArray(inject)) for (const name of inject) result[name] = null;
		else if (Reflect.has(inject, symbols.checkProto)) {
			Object.assign(result, resolve(Object.getPrototypeOf(inject)));
			for (const name of Object.keys(inject)) result[name] = inject[name] ?? null;
		} else for (const name of Object.keys(inject)) result[name] = inject[name] ?? null;
		return result;
	}
	Inject.resolve = resolve;
})(Inject || (Inject = {}));
/**
* Plugin registry installed as `ctx.registry` and mixed into every context.
*
* It normalizes plugin shapes, tracks plugin runtimes, starts fibers, and
* exposes map-like inspection over active plugin callbacks.
*/
var RegistryService = class {
	ctx;
	_counter = 0;
	_internal = /* @__PURE__ */ new Map();
	constructor(ctx) {
		this.ctx = ctx;
		defineProperty(this, symbols.tracker, {
			property: "ctx",
			noShadow: true
		});
	}
	/** Allocate the next fiber uid (increments on every read). */
	get counter() {
		return ++this._counter;
	}
	/** Number of registered plugin runtimes. */
	get size() {
		return this._internal.size;
	}
	/**
	* Resolve a supported plugin shape to its executable callback.
	*
	* @param plugin — a function, class, or `{ apply }` object plugin.
	* @returns the callback identifying the plugin, or `undefined` if invalid.
	*/
	resolve(plugin) {
		try {
			if (typeof plugin === "function") return plugin;
			if (isApplicable(plugin)) return plugin.apply;
		} catch {}
	}
	/**
	* Look up the runtime record for a plugin.
	*
	* @param plugin — any supported plugin shape.
	* @returns the runtime, or `undefined` when the plugin is not registered.
	*/
	get(plugin) {
		const key = this.resolve(plugin);
		return key && this._internal.get(key);
	}
	/**
	* Check whether a plugin has a registered runtime.
	*
	* @param plugin — any supported plugin shape.
	* @returns `true` when at least one fiber of the plugin exists.
	*/
	has(plugin) {
		const key = this.resolve(plugin);
		return !!key && this._internal.has(key);
	}
	/**
	* Dispose every running fiber for a plugin and remove its runtime record.
	*
	* @param plugin — any supported plugin shape.
	* @returns the removed runtime, or `undefined` when none was registered.
	*/
	delete(plugin) {
		const key = this.resolve(plugin);
		const runtime = key && this._internal.get(key);
		if (!runtime) return;
		this._internal.delete(key);
		for (const fiber of runtime.fibers) fiber.dispose();
		return runtime;
	}
	/** Iterate the registered plugin callbacks. */
	keys() {
		return this._internal.keys();
	}
	/** Iterate the registered plugin runtimes. */
	values() {
		return this._internal.values();
	}
	/** Iterate `[callback, runtime]` pairs. */
	entries() {
		return this._internal.entries();
	}
	/**
	* Visit every registered runtime.
	*
	* @param callback — receives each runtime and its identifying callback.
	*/
	forEach(callback) {
		return this._internal.forEach(callback);
	}
	/**
	* Start a callback once the requested dependencies are available.
	*
	* @param inject — required services, as an array or a name → config map.
	* @param callback — plugin body called with `(ctx, config)`.
	* @returns the fiber; awaiting it settles once loading finished.
	*/
	inject(inject, callback) {
		return this.plugin({
			inject,
			apply: callback,
			name: callback.name
		});
	}
	/**
	* Start a plugin in the current context and return its fiber.
	*
	* Creates (or reuses) the plugin's runtime record, then starts a new fiber
	* under the current context. Throws if `plugin` is not a supported shape or
	* if the current fiber is already disposed.
	*
	* @param plugin — a function, class, or `{ apply }` object plugin.
	* @param config — the plugin config, validated against its `Config` schema.
	* @param getOuterStack — captures the caller stack for effect diagnostics.
	* @returns the fiber; awaiting it settles once loading finished.
	*/
	plugin(plugin, config, getOuterStack = buildOuterStack()) {
		const callback = this.resolve(plugin);
		if (!callback) throw new Error("invalid plugin, expect function or object with an \"apply\" method, received " + typeof plugin);
		this.ctx.fiber.assertActive();
		let runtime = this._internal.get(callback);
		if (!runtime) {
			let name = plugin.name;
			if (name === "apply") name = void 0;
			runtime = {
				name,
				callback,
				fibers: new DisposableList(),
				Config: plugin.Config
			};
			this._internal.set(callback, runtime);
		}
		const fiber = new Fiber(this.ctx, config, Inject.resolve(plugin.inject), runtime, getOuterStack);
		const wrapped = Object.create(fiber);
		wrapped.then = (onFulfilled, onRejected) => {
			return fiber.await().then(onFulfilled, onRejected);
		};
		return wrapped;
	}
};
/**
* Root and child dependency containers for Cordis plugins.
*
* A context is a proxy: normal property reads go through the service resolver,
* while `extend()`, `isolate()`, and `intercept()` create scoped child
* contexts without mutating their parent.
*/
var Context = class Context {
	/** Symbol key under which a disposer exposes its {@link EffectMeta} diagnostics tree. */
	static effect = symbols.effect;
	/** Symbol key for a context's listener filter, consulted on every event dispatch. */
	static filter = symbols.filter;
	/** Symbol key of the isolation map (see the `Context[symbols.isolate]` property). */
	static isolate = symbols.isolate;
	/** Symbol key of the intercept map (see the `Context[symbols.intercept]` property). */
	static intercept = symbols.intercept;
	/**
	* Returns true for Cordis context proxies and context prototypes.
	*
	* Works across realms and across multiple copies of cordis, because the
	* brand is keyed by a global symbol rather than by `instanceof`.
	*
	* @param value — the value to test.
	* @returns `true` if `value` is a Cordis context, narrowing its type.
	*/
	static is(value) {
		return !!value?.[Context.is];
	}
	static {
		Context.is[Symbol.toPrimitive] = () => Symbol.for("cordis.is");
		Context.prototype[Context.is] = true;
	}
	/** Create the root context and install the built-in services. */
	constructor() {
		this[symbols.isolate] = Object.create(null);
		this[symbols.intercept] = Object.create(null);
		const self = new Proxy(this, ReflectService.handler);
		this.root = self;
		this.baseUrl = void 0;
		this.fiber = new Fiber(self, {}, Object.create(null), null, () => []);
		this.reflect = new ReflectService(self);
		this.registry = new RegistryService(self);
		this.events = new EventsService(self);
		this.logger = new LoggerService(self);
		this.fiber._disposables.clear();
		return self;
	}
	[Symbol.for("nodejs.util.inspect.custom")]() {
		return `Context <${this.fiber.name}>`;
	}
	/**
	* Create a child context with extra metadata on top of the current scope.
	*
	* The child prototypally inherits every property of this context; own
	* properties of `meta` shadow the inherited ones. The parent is not mutated.
	*
	* @param meta — own properties (including symbol keys) to define on the child.
	* @returns a child context inheriting from this one.
	*/
	extend(meta = {}) {
		const shadow = Reflect.getOwnPropertyDescriptor(this, symbols.shadow)?.value;
		const self = Object.create(getTraceable(this, this));
		for (const prop of Reflect.ownKeys(meta)) Object.defineProperty(self, prop, Reflect.getOwnPropertyDescriptor(meta, prop));
		if (!shadow) return self;
		return Object.assign(Object.create(self), { [symbols.shadow]: shadow });
	}
	/**
	* Create a child context with an independent service scope for `name`.
	*
	* Below the returned context, reads and writes of the service `name`
	* resolve against the new label instead of the parent's, so a different
	* implementation can be provided without affecting the parent scope.
	* Passing the same `label` to two `isolate()` calls joins their scopes.
	*
	* @param name — the service name to isolate.
	* @param label — scope label to join; defaults to a fresh unique symbol.
	* @returns a child context whose `name` service resolves in the new scope.
	*/
	isolate(name, label) {
		const shadow = Object.create(this[symbols.isolate]);
		shadow[name] = label ?? Symbol(name);
		return this.extend({ [symbols.isolate]: shadow });
	}
	intercept(name, config) {
		const intercept = Object.create(this[symbols.intercept]);
		intercept[name] = config;
		return this.extend({ [symbols.intercept]: intercept });
	}
};
/**
* Base class for services that expose a named API on `ctx`.
*
* Subclasses call `super(ctx, name)` from their constructor. The service is
* registered immediately and is automatically removed with the owning fiber.
*/
var Service = class Service {
	ctx;
	/** Symbol key of an instance method run after construction (class plugins). */
	static init = symbols.init;
	/** Symbol key of the availability predicate passed to `ctx.provide()`. */
	static check = symbols.check;
	/** Symbol key of the phantom intercept-config type parameter. */
	static config = symbols.config;
	/** Symbol key of the call body making a service callable (e.g. `ctx.logger()`). */
	static invoke = symbols.invoke;
	/** Symbol key of the helper deriving an extended service instance. */
	static extend = symbols.extend;
	/** Symbol key of the tracker metadata used for context tracing. */
	static tracker = symbols.tracker;
	/** Symbol key of the intercept-config resolution helper below. */
	static resolveConfig = symbols.resolveConfig;
	/** The service name this instance is registered under. */
	name;
	/**
	* Register this instance as `name` in the current context.
	*
	* Calls `ctx.reflect.provide(name, this, this[Service.check])`, so the
	* service is unregistered automatically when the owning fiber unloads.
	* Services with a `[Service.invoke]` body return a callable instance.
	*
	* @param ctx — the context to register in (stored as `this.ctx`).
	* @param name — the service name; defaults to the static `provide` field.
	*/
	constructor(ctx, name) {
		this.ctx = ctx;
		name ??= this.constructor["provide"];
		let self = this;
		const tracker = {
			associate: name,
			property: "ctx"
		};
		if (self[symbols.invoke]) self = createCallable(name, joinPrototype(Object.getPrototypeOf(this), Function.prototype), tracker);
		self.ctx = ctx;
		self.name = name;
		defineProperty(self, symbols.tracker, tracker);
		self.ctx.reflect.provide(name, self, this[symbols.check]);
		return self;
	}
	[symbols.filter](ctx) {
		return ctx[symbols.isolate][this.name] === this.ctx[symbols.isolate][this.name];
	}
	[symbols.extend](props) {
		let self;
		if (this[Service.invoke]) self = createCallable(this.name, this, this[symbols.tracker]);
		else self = Object.create(this);
		return Object.assign(self, props);
	}
	/**
	* Merge intercept config from ancestors with optional base and head values.
	*
	* Entries added closer to the root apply first; `base` is prepended and
	* `head` appended. Uses `Config.merge` when the service declares one,
	* otherwise a shallow `Object.assign`.
	*
	* @param base — lowest-precedence config merged before all intercepts.
	* @param head — highest-precedence config merged after all intercepts.
	* @returns the merged config.
	*/
	[symbols.resolveConfig](base, head) {
		let intercept = this.ctx[Context.intercept];
		const configs = [];
		while (this.name in intercept) {
			if (Object.hasOwn(intercept, this.name)) configs.unshift(intercept[this.name]);
			intercept = Object.getPrototypeOf(intercept);
		}
		if (base) configs.unshift(base);
		if (head) configs.push(head);
		if (this["Config"]?.merge) return this["Config"].merge(...configs);
		else return Object.assign({}, ...configs);
	}
	static [Symbol.hasInstance](instance) {
		if (!instance) return false;
		let constructor = instance.constructor;
		while (constructor) {
			constructor = constructor.prototype?.constructor;
			if (constructor === this) return true;
			constructor &&= Object.getPrototypeOf(constructor);
		}
		return false;
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/@deepseek-ai+dsh-typert-pro_4c8b29c7a771ab5a14d2f5acbb8891a6/node_modules/@deepseek-ai/dsh-typert-protocol/lib/index.js
/**
* Remote decorators and explicit Gateway bindings backed by versioned
* descriptors carried on decorated class prototypes. Strict reflection
* remains a Typert compiler responsibility.
* @module @deepseek-ai/dsh-typert-protocol
*/
const TYPERT_REMOTE_SEGMENT_PATTERN = /^[A-Za-z0-9_$.-]+$/;
/**
* Test one generated Remote name against the Connection endpoint grammar.
* @param value - namespace, method, lookup, or Context segment.
* @returns whether the value can cross the shared RPC carrier unchanged.
*/
function isTypertRemoteSegment(value) {
	return value !== "." && value !== ".." && TYPERT_REMOTE_SEGMENT_PATTERN.test(value);
}
const REMOTE_METHOD_DESCRIPTOR = "@deepseek-ai/dsh-typert-protocol/remote-methods";
/**
* Bind one visible Service field to a Cordis key and Remote namespace. A
* service that owns a Cordis Context also gives its tree `ctx.invocation`,
* `undefined` outside a Remote call, so no `TypertRemoteService` is needed for
* a Host composition to read it.
* @param service - owning Service instance, normally `this`.
* @param serviceKey - exact Cordis service key.
* @param options - optional distinct wire namespace.
* @returns a frozen, inspectable binding with no compiler-injected metadata.
*/
function bindTypertRemote(service, serviceKey, options = {}) {
	validateName("service key", serviceKey);
	const namespace = options.namespace ?? serviceKey;
	validateName("namespace", namespace);
	const ctx = Reflect.get(service, "ctx");
	if (ctx instanceof Context) provideInvocationAccessor(ctx);
	return Object.freeze({
		service,
		serviceKey,
		namespace
	});
}
/** Cordis Service base that exposes its registered name through Typert Gateway. */
var TypertRemoteService = class extends Service {
	/** Visible binding consumed by the Gateway's source-mode discovery. */
	typertRemote;
	/**
	* Register the Service and bind the same key to Typert Gateway.
	* @param ctx - owning Cordis Context.
	* @param serviceKey - exact Cordis service key and default wire namespace.
	* @param options - optional distinct wire namespace.
	*/
	constructor(ctx, serviceKey, options = {}) {
		super(ctx, serviceKey);
		this.typertRemote = bindTypertRemote(this, this.name, options);
	}
};
/**
* Make `ctx.invocation` read as `undefined` outside a Remote call instead of the
* reflect service's "cannot get property" error; a call-derived Context shadows
* the accessor with its own property. The first Remote Service constructed in a
* tree registers it on the root, where it outlives any one Service.
*/
function provideInvocationAccessor(ctx) {
	if (Object.hasOwn(ctx.root.reflect.props, "invocation")) return;
	ctx.root.accessor("invocation", { get: () => void 0 });
}
function Remote(methodExportOrOptions, context) {
	if (typeof methodExportOrOptions === "string") {
		validateName("Remote export name", methodExportOrOptions);
		return remoteDecorator({ kind: "direct" }, void 0, methodExportOrOptions);
	}
	if (typeof methodExportOrOptions === "object") {
		if (remoteOptionMode(methodExportOrOptions) !== "stream" || Reflect.ownKeys(methodExportOrOptions).length !== 1) throw new TypeError("typert-protocol: Remote options must contain exactly mode: \"stream\"");
		return remoteDecorator({ kind: "direct" }, "stream");
	}
	if (context === void 0) throw new TypeError("typert-protocol: Remote decorator context is missing");
	addMarkerInitializer(context, { kind: "direct" });
}
function remoteOptionMode(options) {
	return Reflect.get(options, "mode");
}
function remoteDecorator(invocation, mode, exportName) {
	return function(_method, context) {
		addMarkerInitializer(context, invocation, mode, exportName);
	};
}
function readRemoteMethodDescriptor(prototype) {
	const property = Object.getOwnPropertyDescriptor(prototype, REMOTE_METHOD_DESCRIPTOR);
	if (property === void 0) return void 0;
	const descriptor = property.value;
	if (descriptor === null || typeof descriptor !== "object") throw new TypeError("typert-protocol: Remote method descriptor must be an object");
	const version = Reflect.get(descriptor, "version");
	if (version !== 1) throw new TypeError(`typert-protocol: unsupported Remote method descriptor version ${String(version)}`);
	const methods = Reflect.get(descriptor, "methods");
	if (!Array.isArray(methods)) throw new TypeError("typert-protocol: Remote method descriptor methods must be an array");
	return descriptor;
}
function addMarkerInitializer(context, invocation, mode, exportName) {
	if (context.private || context.static || typeof context.name !== "string") throw new TypeError("typert-protocol: Remote decorators require a public instance method with a string name");
	const method = context.name;
	context.addInitializer(function() {
		const prototype = Object.getPrototypeOf(this);
		if (prototype === null) throw new TypeError(`typert-protocol: cannot mark Remote method "${method}" on an object without a prototype`);
		mark(prototype, method, invocation, mode, exportName);
	});
}
function mark(prototype, method, invocation, mode, exportName) {
	const descriptor = readRemoteMethodDescriptor(prototype);
	const marker = Object.freeze({
		method,
		...exportName === void 0 || exportName === method ? {} : { exportName },
		...mode === void 0 ? {} : { mode },
		invocation: Object.freeze(invocation)
	});
	const current = descriptor?.methods.find((candidate) => candidate.method === method);
	if (current !== void 0) {
		if (current.exportName === marker.exportName && current.mode === marker.mode && sameInvocation(current.invocation, invocation)) return;
		throw new Error(`typert-protocol: Remote method "${method}" has conflicting invocation markers`);
	}
	Object.defineProperty(prototype, REMOTE_METHOD_DESCRIPTOR, {
		configurable: true,
		value: Object.freeze({
			version: 1,
			methods: Object.freeze([...descriptor?.methods ?? [], marker])
		})
	});
}
function sameInvocation(left, right) {
	if (left.kind === "direct") return right.kind === "direct";
	if (right.kind === "direct") return false;
	return left.context === right.context;
}
function validateName(subject, value) {
	if (!isTypertRemoteSegment(value)) throw new TypeError(`typert-protocol: ${subject} must contain only RPC endpoint segment characters`);
}
//#endregion
//#region src/refs.ts
/**
* TPT 席位的**身份常量**（零依赖模块，宿主半与浏览器半共用的唯一权威来源）。
*
* 单独成文件的理由不是整洁：`index.ts`（Config schema）引 `@deepseek-ai/schemastery` 与
* `@deepseek-ai/dsh-llm`，而浏览器半的 bundle 由 tsdown 把非模块表依赖**全量内联** ⇒ 从
* `index.ts` 取常量会把 zod 和
* dsh-llm 打进 `lib/client.js`（后者顶层还会 `createRequire('../package.json')`，浏览器里必炸）。
* 本文件不许引入任何依赖，两个浏览器半可直接 import。
*
* @module @tpt-work/llm-tpt/refs
*/
/** 本插件的 settings 命名空间（档案根即 provider 档案，`settingsPath` 为空）。 */
const TPT_SETTINGS_NS = "llm-tpt";
/** TPT 席位路由（与旧包 `@tpt-work/llm-tpt` 的 `tpt` 独立，互不干扰）。 */
const TPT_PROVIDER_ROUTE = "tpt-official";
/**
* TPT 席位凭据引用：登录窗（壳）经 `tptIdentity/writeIdentity` 写入，请求时解析为 Bearer；
* 设置卡（首启引导浏览器半）仍可经 `credentials/set` 改写。界面写的键与请求读的键不可能分叉。
*
* 命名（需求方 2026-09-28 拍板）：登录身份三件套 `TPT_USER_NAME` / `TPT_API_KEY` / `TPT_TENANT_ID`
* 成套同名，本引用定 `TPT_API_KEY`（旧名 `TPT_GATEWAY_API_KEY` 让位；已按旧名落盘的值不迁移，
* 重新登录一次即落到新键）。2026-09-29 需求方追加第四件 `TPT_USER_ID`（恒 `1`，见下）。
*/
const TPT_API_KEY_REF = "TPT_API_KEY";
/**
* 登录身份引用：用户名（登录窗「用户名」）。唯一权威来源在本文件；壳经 `tptIdentity` 读写，
* 账号包的退出登录路径持有一份对齐副本（`tests/quality` 的常量奇偶门禁钉住）。
*/
const TPT_USER_NAME_REF = "TPT_USER_NAME";
/**
* 登录身份引用：企业标志（企业用户的租户代号；个人用户不写。展示语义 = 「企业标志」，
* 展示权威来源是设置缓存，见 `@tpt-work/settings-tpt`）。
*/
const TPT_TENANT_ID_REF = "TPT_TENANT_ID";
/**
* 登录身份引用：用户 id（需求方 2026-09-29 口径「增加一个 user id，永远是 1」）。
*
* **取值不来自登录窗**：本机单用户形态下它是常量（真账号体系到位前没有第二个来源），
* 登录时由 `writeIdentity` 连同另三件一起落盘、退出登录同批清掉；对外经 `/__auth` 应答
* 以 `userId` 报出（`@tpt-work/account` 的 `mcp-credential.ts`）。
*/
const TPT_USER_ID_REF = "TPT_USER_ID";
//#endregion
//#region src/identity.ts
/**
* `tptIdentity` Remote 服务（`@tpt-work/llm-tpt` 宿主半）：TPT 网关登录身份的读写入口。
*
* ## 为什么住在模型席位包
*
* 登录身份四件套（用户名 / 网关密钥 / 企业标志 / 用户 id）就是**网关的认证材料**：`TPT_API_KEY` 本来就是本包
* 请求侧解析 Bearer 的凭据引用（`refs.ts` = 唯一权威来源），用户名与企业标志同族同源 ⇒ 读写入口收在
* 本包，引用名不进壳。账号包的退出登录路径有一份引用名对齐副本（奇偶门禁钉住），那是"清身份"动作
* 需要就地走 `credentials/unset` 的代价，不是第二本账。
*
* ## 消费方与边界
*
* - **壳（vendor/dsh-desktop 登录窗后端）**：`readIdentity` 取预填（`apiKey` 即密码值，是否展示由
*   「记住密码」开关在壳侧判）；`writeIdentity` 落登录身份。
* - **不接浏览器半**：读数含密钥明文，只有壳的登录窗该拿；本包没有客户端半，命名空间不挂任何
*   `$mount` 贡献。
* - 写入语义（需求方拍板）：个人用户 = 用户名 + 密钥 + 用户 id（企业标志显式 `unset`，防上一次企业登录
*   残留）；企业用户 = 四件全写；退出登录 = 四件全清（在账号包路径）。**用户 id 不是登录窗的入参**——
*   本机单用户形态下它是常量（`refs.ts` 的 `TPT_USER_ID_VALUE`），由本服务落盘，登录窗不必知道它。
*
* 蓝本：`@tpt-work/sidebar` 的宿主半 Remote（本地 `remoteMethod` 复刻装饰器 + 构造即自注册）。
*
* @module @tpt-work/llm-tpt/identity
*/
/** wire 命名空间 = cordis 服务键（两处同一字符串，唯一来源在此）。 */
const TPT_IDENTITY_SERVICE_KEY = "tptIdentity";
/** 密钥判据（与壳登录窗同一条：可见 ASCII 且非空）。 */
const SECRET_PATTERN = /^[\x21-\x7e]+$/;
var TptIdentityService = class extends TypertRemoteService {
	credentials;
	/**
	* @param ctx - 宿主 context（`credentials` 服务由本插件 `inject` 声明，构造期已在）。
	*/
	constructor(ctx) {
		super(ctx, TPT_IDENTITY_SERVICE_KEY, { namespace: TPT_IDENTITY_SERVICE_KEY });
		this.credentials = ctx.credentials;
	}
	/** 读当前登录身份（四件独立判缺省；单件解析失败按缺省收口——读数不该比登录页更脆）。 */
	async readIdentity() {
		const [userName, apiKey, enterpriseMark, userId] = await Promise.all([
			this.resolveRef(TPT_USER_NAME_REF),
			this.resolveRef(TPT_API_KEY_REF),
			this.resolveRef(TPT_TENANT_ID_REF),
			this.resolveRef(TPT_USER_ID_REF)
		]);
		return {
			...userName === void 0 ? {} : { userName },
			...apiKey === void 0 ? {} : { apiKey },
			...enterpriseMark === void 0 ? {} : { enterpriseMark },
			...userId === void 0 ? {} : { userId }
		};
	}
	/**
	* 落登录身份：用户名 + 密钥 + 用户 id 必写；企业标志只在企业用户写（个人用户显式 `unset`）。任何一件
	* 校验不过就整次拒掉（写入不留半套——半套身份比没有身份更难排查）。
	*/
	async writeIdentity(input) {
		const userName = typeof input?.userName === "string" ? input.userName.trim() : "";
		const apiKey = typeof input?.apiKey === "string" ? input.apiKey : "";
		const hasMark = input?.enterpriseMark !== void 0;
		const enterpriseMark = hasMark && typeof input.enterpriseMark === "string" ? input.enterpriseMark.trim() : "";
		if (userName === "") throw new Error("llm-tpt: writeIdentity needs a non-empty userName");
		if (!SECRET_PATTERN.test(apiKey)) throw new Error("llm-tpt: writeIdentity needs a printable non-empty apiKey");
		if (hasMark && enterpriseMark === "") throw new Error("llm-tpt: writeIdentity needs a non-empty enterpriseMark when present");
		await this.credentials.set(TPT_USER_NAME_REF, userName);
		await this.credentials.set(TPT_API_KEY_REF, apiKey);
		await this.credentials.set(TPT_USER_ID_REF, "1");
		if (hasMark) await this.credentials.set(TPT_TENANT_ID_REF, enterpriseMark);
		else await this.credentials.unset(TPT_TENANT_ID_REF);
		return { ok: true };
	}
	/** 单引用解析：空值/未配置/解析失败都折成缺省（调用方按"这一件没写"理解）。 */
	async resolveRef(ref) {
		try {
			const value = (await this.credentials.resolve(ref))?.value;
			return typeof value === "string" && value.length > 0 ? value : void 0;
		} catch {
			return;
		}
	}
};
/**
* 手动登记一个 Remote 方法——**等价于编译后的 `@Remote('name')`**（本包构建链不转译装饰器语法；
* 复刻与陷阱的完整说明见 `@tpt-work/sidebar` 宿主半同款 helper：initializer 的 `this` 必须是实例，
* 挂错到父类原型 ⇒ 命名空间零方法、`/api/tptIdentity/*` 一律 404）。
*/
function remoteMethod(prototype, method) {
	const context = {
		kind: "method",
		name: method,
		static: false,
		private: false,
		metadata: void 0,
		access: {
			has: () => true,
			get: (target) => Reflect.get(target, method)
		},
		addInitializer: (initializer) => {
			initializer.call(Object.create(prototype));
		}
	};
	Remote(method)(Reflect.get(prototype, method), context);
}
remoteMethod(TptIdentityService.prototype, "readIdentity");
remoteMethod(TptIdentityService.prototype, "writeIdentity");
//#endregion
//#region src/sse.ts
/**
* 逐行解析 SSE 文本为帧序列。`data:` 多行按 SSE 规范以 `\n` 拼接；空帧跳过；
* 顶层正文里出现 `[DONE]` 时结束。宽容处理 CRLF。
*/
function parseSseFrames(text) {
	const frames = [];
	let event = "message";
	let dataLines = [];
	let inFrame = false;
	const flush = () => {
		if (inFrame) frames.push({
			event,
			data: dataLines.join("\n")
		});
		event = "message";
		dataLines = [];
		inFrame = false;
	};
	for (let line of text.split(/\r?\n/)) {
		if (line === "") {
			flush();
			continue;
		}
		if (line.startsWith("event:")) {
			event = line.slice(6).trim();
			inFrame = true;
			continue;
		}
		if (line.startsWith("data:")) {
			const value = line.slice(5);
			const body = value.startsWith(" ") ? value.slice(1) : value;
			if (body.trimEnd() === "[DONE]") {
				flush();
				return frames;
			}
			dataLines.push(body);
			inFrame = true;
			continue;
		}
	}
	flush();
	return frames;
}
/**
* 把 SSE 文本缓冲切成"已完整帧 + 剩余串"（跨 chunk 断句安全，一次读出多个完整帧也全部切出）。
*
* 与蓝本 `@tpt-work/llm-tpt` 的差异（此处修正）：蓝本 `findFrameEnd` 返回不含分隔空行的位置、
* `rest` 因此总以下一个分隔空行开头，下一轮 `indexOf('\n\n')` 命中 0 导致缓冲永不前进——
* 流里只有第一帧能被解析。这里改为返回**含分隔空行**的长度，并循环切片直到无完整帧。
*/
function splitFrames(buffer) {
	const frames = [];
	let rest = buffer;
	for (let end = findFrameEnd(rest); end >= 0; end = findFrameEnd(rest)) {
		for (const frame of parseSseFrames(rest.slice(0, end))) frames.push(frame);
		rest = rest.slice(end);
	}
	return {
		frames,
		rest
	};
}
/** 定位一个完整帧的结束（一个空行分隔）。返回**含该空行**的长度（-1 = 还没有完整帧）。 */
function findFrameEnd(buffer) {
	const lineFeed = buffer.indexOf("\n\n");
	const carriageReturn = buffer.indexOf("\r\n\r\n");
	if (carriageReturn >= 0 && (lineFeed === -1 || carriageReturn < lineFeed)) return carriageReturn + 4;
	if (lineFeed >= 0) return lineFeed + 2;
	return -1;
}
//#endregion
//#region src/serialize.ts
/**
* 把 dsh 请求翻译成 OpenAI Responses wire 请求（请求拼接，纯函数、不发请求）。
*
* 模块职责（对齐 dsh 官方 `dsh-llm-deepseek` 的 serialize.ts：序列化与传输分层）：
* `serializeMessages` 把消息序列翻译为 Responses `input` 项 + `instructions`（system 槽），
* `serializeRequest` 组装完整请求体。工具参数始终是 **RAW JSON 字符串**；图像在此以
* `input_image` 数据 URL part 原位插入（数据 URL 表由 adapter 预先解析，键 = attachmentId）。
*
* @module @tpt-work/llm-tpt/serialize
*/
/**
* 把一条消息的内容块映射为 Responses output/function_call 项（不含 tool-result 的其余内容）。
*
* assistant 文本项恒带 `type: 'message'`：TPT responses 网关对裸 `{role:'assistant',
* content:[…]}` 回 **HTTP 400**（整请求拒收 ⇒ 会话第二条消息起必挂），判据与实测见
* {@link WireInputItem}。
*/
function serializeAssistantItems(content) {
	const items = [];
	const text = [];
	for (const block of content) if (block.type === "text") text.push(block.text);
	else if (block.type === "tool-call") items.push({
		type: "function_call",
		call_id: block.id,
		name: block.name,
		arguments: block.arguments
	});
	if (text.length > 0) items.push({
		type: "message",
		role: "assistant",
		content: text.map((t) => ({
			type: "output_text",
			text: t
		}))
	});
	return items;
}
/** 把 tool-result 块序列化为 Responses `function_call_output.output` 字符串。 */
function serializeToolResultOutput(content) {
	const text = content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
	const rest = content.filter((b) => b.type !== "text");
	if (rest.length === 0) return text;
	return JSON.stringify(rest.length === 1 ? rest[0] : rest);
}
/**
* 把 dsh 消息序列翻译为 Responses `input` 项 + `instructions`（system 槽）。角色只认
* user/assistant/tool-result；tool-result 以 `role:'user'` 的 `tool-result` 内容块出现。
* `images` 是已解析的图像数据 URL 表（键 = 块的 `attachment.attachmentId`），user 消息里的
* 图像块按原位插成 `input_image` part；tool-result 内的图像不在此路径（仍走 JSON 序列化）。
*/
function serializeMessages(messages, system, images = /* @__PURE__ */ new Map()) {
	const input = [];
	const systemParts = [];
	if (system !== void 0 && system.length > 0) systemParts.push(system);
	for (const message of messages) {
		if (message.role === "system") {
			for (const block of message.content) if (block.type === "text") systemParts.push(block.text);
			continue;
		}
		if (message.role === "user") {
			const parts = [];
			for (const block of message.content) if (block.type === "text") parts.push({
				type: "input_text",
				text: block.text
			});
			else if (block.type === "image") {
				const url = images.get(block.attachment.attachmentId);
				if (url !== void 0) parts.push({
					type: "input_image",
					image_url: url
				});
			}
			if (parts.length > 0) input.push({
				role: "user",
				content: parts
			});
			continue;
		}
		if (message.role === "tool") {
			input.push({
				type: "function_call_output",
				call_id: message.toolCallId,
				output: serializeToolResultOutput(message.content)
			});
			continue;
		}
		if (message.role === "assistant") for (const item of serializeAssistantItems(message.content)) input.push(item);
	}
	const instructions = systemParts.length > 0 ? systemParts.join("\n\n") : void 0;
	return {
		...instructions === void 0 ? {} : { instructions },
		input
	};
}
/** 把 dsh 工具 schema 翻译为 Responses `tools`（Responses 形态是扁平条目）。 */
function serializeTools(tools) {
	if (tools === void 0 || tools.length === 0) return void 0;
	return tools.map((tool) => ({
		type: "function",
		name: tool.name,
		description: tool.description,
		parameters: tool.parameters
	}));
}
/**
* 组装完整请求体（恒为流式；可选字段缺省不发键）。组装失败抛 `LlmError`（稳定 code），
* 由 `LlmRuntime` 归一到 terminal finish；`stop` 序列以 `UNSUPPORTED_OPTION` 明确反对。
*
* @param options - dsh 请求（model/history/system/tools/sampling）。
* @param defaults - 档案侧请求缺省（显式请求值优先）。
* @param images - 已解析的图像数据 URL 表（键 = attachmentId）。
* @param reasoningWire - 选中思考档位的 wire 串（undefined = 不携带 reasoning 字段）。
* @returns Responses 请求体。
*/
function serializeRequest(options, defaults, images, reasoningWire) {
	const { instructions, input } = serializeMessages(options.messages, options.system, images);
	if (options.stop !== void 0) throw new LlmError("a Responses gateway in this build cannot honor the stop list", "UNSUPPORTED_OPTION");
	const body = {
		model: options.model,
		input,
		stream: true
	};
	if (instructions !== void 0) body.instructions = instructions;
	if (options.temperature !== void 0) body.temperature = options.temperature;
	const maxOutput = options.maxTokens ?? defaults.defaultMaxTokens;
	if (maxOutput !== void 0) body.max_output_tokens = maxOutput;
	const tools = serializeTools(options.tools);
	if (tools !== void 0) body.tools = tools;
	if (reasoningWire !== void 0 && reasoningWire.length > 0) body.reasoning = { effort: reasoningWire };
	return body;
}
//#endregion
//#region src/refresh-policy.ts
/**
* `@tpt-work/llm-tpt` 目录获取的**触发点**与**重试策略**（纯函数；接线在 `index.ts` 的 `apply`）。
*
* ## 触发点（需求方 2026-09-29 口径）
*
* 「什么时候会打 `GET {baseURL}{modelsPath}`」是需求方逐条点名的行为，宿主日志里给每次获取打一个
* 标签，需求方按标签核对：`boot`（每次启动软件时）/ `credential`（写 `TPT_API_KEY`，即输入账号密码
* 那一跳）/ `wire`（界面「获取模型」按钮）/ `retry`（失败后按 {@link CATALOG_RETRY_MS} 再试）。
* 完整清单（含"看着像会打其实不打"的情形）见账本
* `implementation/llm-tpt-catalog-fetch-and-multi-url` 的「触发点清单」一节。
*
* ## 为什么重试判据住在这里
*
* 判据要能单测（矩阵逐格钉），而 `apply` 里那堆接线只能靠真机读数。所以失败分类做成纯函数：
* 输入 = 抛出来的错误 + 档案里那两件配置齐不齐，输出 = 值不值得再试。
*
* @module @tpt-work/llm-tpt/refresh-policy
*/
/**
* 单个网关地址的应答上限（含读体）。
*
* ⚠ 不设它会毁掉重试节奏：黑洞地址（SYN 不响应）会挂到操作系统的连接超时（分钟级），
* {@link CATALOG_RETRY_MS} 就只是"两次尝试之间的间隔"而不是事实上的频率。超时按"这个地址没服务成"
* 处理 —— 继续换乘下一个地址，全部地址都没服务成 ⇒ 传输层那一支失败（可重试）。
*/
const CATALOG_ATTEMPT_TIMEOUT_MS = 15e3;
/**
* 打不通时的重试间隔。**固定值**（需求方原话「当填了账号密码 curl 不通时每 30s 一次」）——
* 想换成退避就把这一个常量换成表，接线处不用动。
*/
const CATALOG_RETRY_MS = 3e4;
/**
* 启动后第一次目录获取的延迟：让首屏与登录链先跑完，别跟它们抢网络与设置写。
*/
const BOOT_FETCH_DELAY_MS = 3e3;
/**
* 这次失败值不值得按 {@link CATALOG_RETRY_MS} 的节奏再试。
*
* **可重试**（网关那一侧的问题，等一会儿可能就好了）：
* - 全部地址都没服务成：传输层失败（含单地址超时）、200 但应答不是 JSON、>=500、404 换乘后仍无解；
* - `429`（限流：过一会儿确实可能好）。
*
* **终局**（重试只是往同一个墙上撞）：
* - 配置缺件：没地址 / 没密钥（`MISSING_CREDENTIAL`）；
* - `4xx` 里除 429 外的一切（`401`/`403` 密钥被拒、`400` 请求被拒 —— 报文里的判据是响应状态，
*   由 `catalog.ts` 写在 `LlmError.failure.status` 上）；
* - 调用方取消（`ABORTED`）；
* - 不是 `LlmError` 的意外异常（本层的失败都该是 `LlmError`；真漏了别的，先修那个）。
* @param error - 这次获取抛出来的错误。
* @param config - 配置面是否齐全（见 {@link CatalogRetryConfig}）。
* @returns 值得再试为 true。
*/
function isRetryableCatalogFailure(error, config) {
	if (!config.hasGateway || !config.hasKey) return false;
	if (!(error instanceof LlmError)) return false;
	if (error.failure.code === "ABORTED") return false;
	const status = error.failure.status;
	if (status !== void 0) return status === 429 || status >= 500;
	return error.failure.code === "DISCOVERY_FAILED";
}
//#endregion
//#region src/catalog.ts
/**
* `@tpt-work/llm-tpt` 的模型目录获取管线：多 URL 故障转移的 `GET {baseURL}{modelsPath}` +
* 网关富字段解析（`model_name` 多语名 / `is_default` / `modalities.input` 与 `input_modalities`
* 两形模态 / 容量三形 `contextWindow`+`context_window`+`max_model_len` 与两形 `maxTokens`+
* `max_output_tokens` / `supports_think`+`think_mode`+`think_levels`）。发现与流式共用
* 此处的 URL 列表解析与故障转移判据；持久化（写 settings 段）归注册插件（index.ts）所有，
* 本模块保持纯传输+解析。
*
* **多 URL 语义**（需求方裁定：按顺序用能通的）：`baseURL` 值可含多个 URL（换行/逗号/分号/
* 空白分隔，书写顺序 = 尝试顺序）。一个 URL「能通」= 请求在它身上完成（2xx 且可解析）；
* 网络层失败（连接拒绝/DNS/超时）、`status ≥ 500`、`404` 视为该 URL 不可用 ⇒ 试下一个；
* 其余状态（401/403 鉴权、400/422 请求本身错）与 URL 无关 ⇒ 立即停，不再换 URL。
*
* @module @tpt-work/llm-tpt/catalog
*/
/**
* 面向使用方的错误措辞（需求方裁定 implementation/llm-tpt-catalog-fetch-and-multi-url：**用户可见文案不含任何具体内容**——网关地址、
* HTTP 状态、配置项路径、席位 id 与凭据引用名都不许出现在界面上；上游把非 `AUTH` 的
* `LlmError.message` 原样渲染进对话流，设置卡也直显这段文本，所以脱敏必须发生在消息本身。
* 具体事实一律走宿主日志（{@link TptDiagnosticLog}，由注册插件注入 `ctx.logger`）。
*
* 界面上只保留**用户能做的动作**：缺 key 告诉他去哪里填；网关侧的问题只说「联系管理员」。
*/
const MISSING_KEY_MESSAGE = "尚未配置 TPT 的 API 密钥，暂时无法发起对话。请打开「设置 → 模型 → TPT」填入 API 密钥后重试。";
/** 目录获取路径的缺 key 措辞（同一配置层，动作不同：先保存再获取）。 */
const MISSING_KEY_FOR_DISCOVERY_MESSAGE = "请先填写并保存 API 密钥，再获取模型目录。";
/** 网关地址未配置（部署侧问题，使用方无从操作 ⇒ 只给指向）。 */
const NO_GATEWAY_MESSAGE = "模型网关尚未配置，请联系管理员。";
/** 鉴权被拒（不透露状态码与地址；密钥是唯一用户可动的变量）。 */
const KEY_REJECTED_MESSAGE = "无法获取模型目录：API 密钥未被接受，请检查后重试。";
/** 网关拒绝请求且与密钥无关（400/422 一类）。 */
const REQUEST_REJECTED_MESSAGE = "无法获取模型目录：网关拒绝了本次请求，请稍后重试或联系管理员。";
/** 所有网关地址都没能服务这次请求。 */
const GATEWAY_UNREACHABLE_MESSAGE = "无法获取模型目录：模型网关暂时无法应答，请稍后重试。";
/**
* 把 `baseURL` 值拆成有序 URL 列表：换行/逗号/分号/空白都是分隔符，去空、保序、每项削
* 尾斜杠留给请求拼接处（`{baseURL}{path}` 拼接前再削一次也幂等）。`undefined`/空 ⇒ `[]`。
*/
function parseBaseURLs(raw) {
	if (raw === void 0) return [];
	return raw.split(/[\s,;]+/).filter((url) => url.length > 0);
}
/** 故障转移判据（按 HTTP 状态）：5xx 与 404 = 该 URL 没能服务这个请求；其余状态不转移。 */
function isFailoverStatus(status) {
	return status >= 500 || status === 404;
}
/**
* 归一网关路径段：空/缺省回退 `fallback`；缺前导 `/` 自动补。防 `{baseURL}{path}` 在
* `modelsPath: models` 这类配置下拼出 `http://hostmodels` 坏 URL（两个拼接点共用）。
*/
function gatewayPath(raw, fallback) {
	const value = typeof raw === "string" && raw.length > 0 ? raw : fallback;
	return value.startsWith("/") ? value : `/${value}`;
}
/** 调用方取消判定（独立函数：绕开 TS 对 `signal.aborted` 的前置检查收窄，见 pre-flight 调用处）。 */
function isAborted(signal) {
	return signal?.aborted === true;
}
/** 发现结果的容错形状：裸数组 / `{data: [...]}` / `{models: [...]}`；其余一律视为空列表。 */
function discoveryRows(payload) {
	if (Array.isArray(payload)) return payload;
	if (payload !== null && typeof payload === "object") {
		const record = payload;
		if (Array.isArray(record.data)) return record.data;
		if (Array.isArray(record.models)) return record.models;
	}
	return [];
}
/** 只收正整数；否则 undefined（回落别的来源，或该字段不携带）。 */
function positiveInt(value) {
	return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : void 0;
}
/** `model_name`：只收「对象且值为非空 string」的形状；否则 undefined（该字段不携带）。 */
function parseLocaleNames(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return void 0;
	const names = {};
	for (const [locale, name] of Object.entries(value)) if (typeof name === "string" && name.length > 0) names[locale] = name;
	return Object.keys(names).length > 0 ? names : void 0;
}
/** `modalities.input` / `input_modalities` 与已知模态（text/image）求交；交集为空 = 未声明（回落 defaultInput）。 */
function parseModalities(value) {
	if (!Array.isArray(value)) return void 0;
	const modalities = value.filter((item) => item === "text" || item === "image");
	return modalities.length > 0 ? modalities : void 0;
}
/**
* 一行里模态字段的取数：**两形并列** —— `modalities.input`（TPT 网关 `GET /v1/models` 的真形状）
* 优先，`input_modalities`（旧形 / 其它部署）兜底。
*
* 为什么是两形：2026-09-29 需求方当场 curl 网关卡，模型行给的是
* `"modalities":{"input":["text","image"],"output":["text","image"]}`，而本解析此前只读
* `input_modalities` ⇒ **该字段一直被静默丢掉**（真机可见后果：采纳后的目录条目里 `input` 为空，
* 于是 `qwen-flash` 明明声明了图片输入，composer 也不出图片入口）。`input_modalities` 保留为
* 兼容形，两形都在场时以 `modalities.input` 为准。
*
* ⚠ 嵌套那半形状坏掉（`modalities` 是数组/标量）**不短路**：继续看 `input_modalities` ——
* 新形坏掉不该顺带把旧形那半也丢掉。
* @param record - 一行网关模型。
* @returns 与已知模态求交后的列表；两形都未声明（或交集为空）⇒ `undefined`。
*/
function parseInputModalities(record) {
	const modalities = record.modalities;
	return parseModalities(modalities !== null && typeof modalities === "object" && !Array.isArray(modalities) ? modalities.input : void 0) ?? parseModalities(record.input_modalities);
}
/**
* `supports_think` + `think_levels` → `reasoningEfforts`（键 = 档位 id 匹配
* GenerateOptions.reasoningEffort，值 = 发网关 `reasoning.effort` 的 wire 串；`off: null` =
* 该档不携带 reasoning 字段，其余档位 wire 串 = 档位串 1:1）。仅 `supports_think === true`
* 且 `think_levels` 为非空数组时生成；`think_mode`（toggle/level）不改变映射（两种形状同为
* 「档位表」，档位串即网关自报词汇，数据驱动），也**不携带**默认档与显示名——出厂兜底见
* `reasoning.resolveDefaultEffort` / `reasoning.effortDisplayName`，长期持有写 `modelOverrides`。
*/
function parseReasoningEfforts(supportsThink, thinkLevels) {
	if (supportsThink !== true || !Array.isArray(thinkLevels)) return void 0;
	const efforts = {};
	for (const level of thinkLevels) {
		if (typeof level !== "string" || level.length === 0) continue;
		efforts[level] = level === "off" ? null : level;
	}
	return Object.keys(efforts).length > 0 ? efforts : void 0;
}
/** 一行网关模型 → 目录条目；无 `id`（空/缺/非 string）的行丢弃。 */
function parseGatewayRow(row) {
	if (row === null || typeof row !== "object") return void 0;
	const record = row;
	const id = record.id;
	if (typeof id !== "string" || id.length === 0) return void 0;
	const modelName = parseLocaleNames(record.model_name);
	const inlineName = typeof record.name === "string" && record.name.length > 0 ? record.name : void 0;
	const contextWindow = positiveInt(record.contextWindow) ?? positiveInt(record.context_window) ?? positiveInt(record.max_model_len);
	const maxTokens = positiveInt(record.maxTokens) ?? positiveInt(record.max_output_tokens);
	const input = parseInputModalities(record);
	const reasoningEfforts = parseReasoningEfforts(record.supports_think, record.think_levels);
	return {
		id,
		name: modelName?.zh ?? inlineName ?? id,
		...modelName === void 0 ? {} : { model_name: modelName },
		...record.is_default === true ? { is_default: true } : {},
		...contextWindow === void 0 ? {} : { contextWindow },
		...maxTokens === void 0 ? {} : { maxTokens },
		...input === void 0 ? {} : { input },
		...reasoningEfforts === void 0 ? {} : { reasoningEfforts }
	};
}
/** 解析整个网关响应（三形状容错），返回可用条目（顺序 = 网关行序）。 */
function parseGatewayEntries(payload) {
	const entries = [];
	for (const row of discoveryRows(payload)) {
		const entry = parseGatewayRow(row);
		if (entry !== void 0) entries.push(entry);
	}
	return entries;
}
/**
* 按键匹配一条目录条目（implementation/llm-tpt-default-model-name-pin 默认模型按稳定名解析的共用判定）：`key` 精确等于 `id` →
* `name` → 任一 `model_name` 语种值；精确相等、行序首中，不做模糊/trim/大小写折叠。
* id 优先：key 恰为某条目 id 时恒按 id 命中（同串的名字不抢）；key 为空串恒不中。
*/
function matchModelEntryByKey(entries, key) {
	if (key.length === 0) return void 0;
	return entries.find((entry) => entry.id === key) ?? entries.find((entry) => entry.name === key) ?? entries.find((entry) => entry.model_name !== void 0 && Object.values(entry.model_name).includes(key));
}
/**
* 显示名解析链：`model_name[locale]` → `model_name[语种主子串]`（`zh-CN` → `zh`）→
* `name` → `id`。浏览器半的纯函数副本见 onboarding 包 `display.ts`（零依赖隔离，两处
* 语义一致；不共享文件是因为浏览器半只准 import 零依赖模块）。
*/
function displayNameFor(entry, locale) {
	const names = entry.model_name;
	if (names !== void 0) {
		const exact = names[locale];
		if (typeof exact === "string" && exact.length > 0) return exact;
		const stem = locale.split("-")[0] ?? locale;
		if (stem !== locale) {
			const stemHit = names[stem];
			if (typeof stemHit === "string" && stemHit.length > 0) return stemHit;
		}
	}
	if (typeof entry.name === "string" && entry.name.length > 0) return entry.name;
	return entry.id;
}
/** 目录条目 → wire 发现投影（id + 当前语种显示名 + 容量；富字段不出宿主，见文件头）。 */
function projectDiscovered(entries, locale) {
	return entries.map((entry) => ({
		id: entry.id,
		name: displayNameFor(entry, locale),
		...entry.contextWindow === void 0 ? {} : { contextWindow: entry.contextWindow },
		...entry.maxTokens === void 0 ? {} : { maxTokens: entry.maxTokens }
	}));
}
/**
* 目录获取：多 URL 按序故障转移（判据见文件头），成功即解析返回条目；全部 URL 不可用抛
* `DISCOVERY_FAILED`。**逐 URL 的具体失败原因只进 `options.log`（宿主日志），抛出的 message
* 一律是脱敏后的用户文案**（需求方裁定 implementation/llm-tpt-catalog-fetch-and-multi-url：界面不显示具体内容）。请求头带
* accept/Bearer/attribution/档案 headers；调用方取消（signal aborted）抛 `ABORTED`。
*/
async function fetchCatalog(request, options) {
	const log = options.log ?? (() => {});
	const profile = options.resolveProfile();
	const candidates = parseBaseURLs(request.baseURL ?? profile.baseURL);
	if (candidates.length === 0) {
		log("model catalog discovery has no gateway URL to try (check `baseURL` in the llm-tpt settings section)");
		throw new LlmError(NO_GATEWAY_MESSAGE, "DISCOVERY_FAILED");
	}
	const apiKey = typeof request.apiKey === "string" && request.apiKey.length > 0 ? request.apiKey : await options.resolveApiKey();
	if (apiKey === void 0) {
		log(`model catalog discovery has no API key resolved (credential ref ${TPT_API_KEY_REF}, seat ${TPT_PROVIDER_ROUTE})`);
		throw new LlmError(MISSING_KEY_FOR_DISCOVERY_MESSAGE, "MISSING_CREDENTIAL");
	}
	if (isAborted(options.signal)) throw new LlmError("the request was aborted", "ABORTED");
	const modelsPath = gatewayPath(profile.modelsPath, "/models");
	const failures = [];
	for (const [index, baseURL] of candidates.entries()) {
		const url = `${baseURL.replace(/\/+$/, "")}${modelsPath}`;
		const attemptAbort = new AbortController();
		const attemptTimer = setTimeout(() => {
			attemptAbort.abort();
		}, CATALOG_ATTEMPT_TIMEOUT_MS);
		const attemptSignal = options.signal === void 0 ? attemptAbort.signal : AbortSignal.any([options.signal, attemptAbort.signal]);
		try {
			let response;
			try {
				response = await fetch(url, {
					method: "GET",
					headers: {
						accept: "application/json",
						authorization: `Bearer ${apiKey}`,
						...attributionHeaders(),
						...profile.headers
					},
					signal: attemptSignal
				});
			} catch (error) {
				if (isAborted(options.signal)) throw new LlmError("the request was aborted", "ABORTED");
				const reason = attemptAbort.signal.aborted ? `timeout after ${CATALOG_ATTEMPT_TIMEOUT_MS} ms` : error instanceof Error ? error.message : String(error);
				failures.push(`${url} (${reason})`);
				log(`model catalog attempt ${index + 1}/${candidates.length} failed at transport`, {
					url,
					reason,
					timedOut: attemptAbort.signal.aborted
				});
				continue;
			}
			if (!response.ok) {
				if (isFailoverStatus(response.status)) {
					failures.push(`${url} (HTTP ${response.status})`);
					log(`model catalog attempt ${index + 1}/${candidates.length} is not serviceable, moving on`, {
						url,
						status: response.status
					});
					continue;
				}
				log(`model catalog attempt ${index + 1}/${candidates.length} was rejected; failover stopped`, {
					url,
					status: response.status,
					untried: candidates.length - index - 1
				});
				throw new LlmError(response.status === 401 || response.status === 403 ? KEY_REJECTED_MESSAGE : REQUEST_REJECTED_MESSAGE, "DISCOVERY_FAILED", { status: response.status });
			}
			let text;
			try {
				text = await response.text();
			} catch (error) {
				if (isAborted(options.signal)) throw new LlmError("the request was aborted", "ABORTED");
				const reason = error instanceof Error ? error.message : String(error);
				failures.push(`${url} (${reason})`);
				log(`model catalog attempt ${index + 1}/${candidates.length} failed reading the response body`, {
					url,
					reason
				});
				continue;
			}
			let payload;
			try {
				payload = JSON.parse(text);
			} catch {
				failures.push(`${url} (应答非 JSON)`);
				log(`model catalog attempt ${index + 1}/${candidates.length} answered 200 but is not JSON`, { url });
				continue;
			}
			return parseGatewayEntries(payload);
		} finally {
			clearTimeout(attemptTimer);
		}
	}
	log(`model catalog discovery exhausted all ${candidates.length} gateway URL(s)`, { failures });
	throw new LlmError(GATEWAY_UNREACHABLE_MESSAGE, "DISCOVERY_FAILED");
}
//#endregion
//#region src/reasoning.ts
/**
* `@tpt-work/llm-tpt` 的**思考档位归一化**（纯函数、零 UI、可被 vitest 直接单测）。
*
* 这里解决的是「同一个席位下不同模型思考方式异构」的四件事，口径全在一处：
*
* 1. **能力**来自数据：模型条目的 `reasoningEfforts`（键 = 档位 id，值 = 发网关
*    `reasoning.effort` 的 wire 串；`null` = 该档不携带 reasoning，即「关闭」档；`false` =
*    该模型无思考能力，pi-ai 同名先例）。档位词表由网关/配置自定，本模块不认词表只认形状。
* 2. **默认档**来自分层策略（{@link resolveDefaultEffort}）：模型显式声明 > 档案偏好列表 >
*    档案级 `reasoning`（pi-ai 对齐的旧字段）> 内置「最高非 off 档」兜底。
* 3. **显示名统一英文**（需求方裁定：思考档位不做中英文区分）：`reasoningEffortNames[档位]` →
*    内置英文标签 → 档位串首字母大写（上游 pi-ai 同款兜底，非拉丁词形同原样）。**模型名**才走
*    语种链（`catalog.displayNameFor`），两者口径不同，别互相抄。
* 4. **上游契约的三条硬约束**在这里一次性满足（`dsh-llm` 的 `normalizeModelInfo`）：
*    `efforts` 非空、`id` 不重、`defaultEffort` 必属 `efforts`——违反任一条是
*    `INVALID_MODEL_REASONING`，**整个模型不可用**（不是降级）。
*
* 为什么必须回报 `defaultEffort`：上游 composer 的档位面板在 `reasoning` 存在而
* `defaultEffort` 缺席时会**自己插一栏硬编码的 `Default`**（`dsh-client-ui-model-selection`
* 的 `provider-default` 项）。要让 TPT 席位不出现这一栏、又出厂即带默认思考，唯一不碰上游的
* 做法就是把 `defaultEffort` 补全；而「模型没有思考能力」的表达方式是**整块不回报 `reasoning`**
* （pi-ai 同款：只有一个 `off` 的控件说不出它做得到什么——`off` 译成「不发参数」，与不选档位
* 逐字节同请求）。
*
* @module @tpt-work/llm-tpt/reasoning
*/
/**
* 内置档位强弱顺位（「最高非 off 档」兜底的判据）。词表外的档位 rank = 0，靠**声明序**兜底
* （网关声明序是升序，例 `my-flash` level `[off, low, medium, high]` ⇒ 最后一个非 off 档恰是
* 最高档）。同 rank 取后声明者。
*/
const EFFORT_RANK = {
	minimal: 20,
	low: 30,
	medium: 40,
	think: 45,
	high: 50,
	on: 50,
	xhigh: 60,
	max: 70
};
/** 生效档位表：`false`（无能力）与缺省都返回 `undefined`；空对象视作「未声明」（同 `input` 的空数组守卫）。 */
function effectiveEffortMap(entry) {
	const efforts = entry.reasoningEfforts;
	if (efforts === false || efforts === void 0) return void 0;
	return Object.keys(efforts).length > 0 ? efforts : void 0;
}
/** 档位是否仍然可服务这个模型（`false` / 缺表 / 表里没这个键都算不可用）。 */
function isEffortOffered(entry, effort) {
	const efforts = effectiveEffortMap(entry);
	return efforts !== void 0 && Object.prototype.hasOwnProperty.call(efforts, effort);
}
/**
* 档位显示名：**网关原始词汇**（`reasoningEffortNames[档位]` 是网关自报的显示名，给了就用它；
* 没给就用档位串**原样**）。
*
* 需求方 2026-09-29 拍板「不要映射，就用网关原始词汇」⇒ 去掉内置英文标签表与首字母大写兜底：
* 网关写 `xhigh` 界面就显示 `xhigh`、写 `turbo` 就显示 `turbo`，不再显示成 `Extra high`/`Turbo`。
* 好处是界面上的词与网关文档、与落盘的档位 id 逐字一致（排查时不用做一次心算翻译）；代价是
* 词形不如人工标签好看。**档位 id 本来就一直是原样**（解析层 `catalog.parseReasoningEfforts` 只把
* 「关闭」那档的值记成 `null`），这次改的只是显示层这一处映射。
*
* ⚠ 与「档位标签不做中英文区分」那条既有裁定不冲突：原样词仍是任何语种下同一串。
*/
function effortDisplayName(effort, names) {
	const declared = names?.[effort];
	return typeof declared === "string" && declared.length > 0 ? declared : effort;
}
/** 档位强弱顺位查表（大小写宽容；词表外 = 0）。`pickHighestEffort` 与展示排序共用一处权威来源。 */
function effortRank(effort) {
	return EFFORT_RANK[effort] ?? EFFORT_RANK[effort.toLowerCase()] ?? 0;
}
/** 「最高非 off 档」：rank 最大者，同 rank 取声明序最后；词表外档位 rank = 0。 */
function pickHighestEffort(efforts) {
	let best;
	let bestRank = 0;
	for (const [effort, wire] of Object.entries(efforts)) {
		if (wire === null) continue;
		const rank = effortRank(effort);
		if (best === void 0 || rank >= bestRank) {
			best = effort;
			bestRank = rank;
		}
	}
	return best;
}
/**
* 默认思考档的**分层解析**（顺位命中即止；返回值恒为档位表里的键，或 `undefined`）。
*
* 1. 模型级 `defaultReasoningEffort`（显式，允许指到 `off` = 「隐藏 Default 但默认不思考」）；
* 2. 档案级 `thinkingPreference` 有序偏好（任意词表）；
* 3. 档案级 `reasoning`（pi-ai 对齐的旧字段，向后兼容）；
* 4. 内置兜底 = 最高非 `null` 档（`off` 这类「不携带 reasoning」的档不参与兜底，否则出厂
*    默认就成了「不思考」，与需求相反）。
*/
function resolveDefaultEffort(efforts, entry, profile) {
	const has = (effort) => typeof effort === "string" && Object.prototype.hasOwnProperty.call(efforts, effort);
	if (has(entry.defaultReasoningEffort)) return entry.defaultReasoningEffort;
	for (const preference of profile.thinkingPreference ?? []) if (has(preference)) return preference;
	if (has(profile.reasoning)) return profile.reasoning;
	return pickHighestEffort(efforts);
}
/**
* 组装上游 `reasoning` 元数据；**模型没有可服务的思考档位时返回 `undefined`**（整块不回报，
* 界面就没有推理等级入口）。
*
* 展示顺序 = 「关闭」（`null` = 不携带 reasoning）恒排最前，其余可服务档按强弱**升序**
* （`EFFORT_RANK`；未知档 rank = 0 按声明序稳定）——单调递增、关闭打头，面板一眼可读
* （`{off,low,high,max}` → Off, Low, High, Max），避免把「关闭」塞到末位造成非单调序。
*
* @param entry - 生效模型条目（`models` 与 `modelOverrides` 的合成结果）。
* @param profile - 档案级默认档来源。
* @param note - 显式默认档命不中时的留痕钩子（只准落宿主日志，见 implementation/llm-tpt-catalog-fetch-and-multi-url 脱敏口径）。
* @returns 归一化的思考元数据（`defaultEffort` 恒有值），或 `undefined`。
*/
function buildReasoningInfo(entry, profile, note) {
	const efforts = effectiveEffortMap(entry);
	if (efforts === void 0) return void 0;
	const declared = resolveDefaultEffort(efforts, entry, profile);
	const explicit = entry.defaultReasoningEffort;
	if (explicit !== void 0 && !isEffortOffered(entry, explicit)) note?.(`declared default reasoning effort "${explicit}" is not offered by this model; falling back to "${declared ?? "(none)"}"`);
	if (declared === void 0) {
		note?.("reasoning capability declared without any serviceable effort");
		return;
	}
	return {
		efforts: [...Object.keys(efforts).filter((id) => efforts[id] === null), ...Object.keys(efforts).filter((id) => efforts[id] !== null).sort((a, b) => effortRank(a) - effortRank(b))].map((id) => ({
			id: ReasoningEffortId(id),
			name: effortDisplayName(id, entry.reasoningEffortNames)
		})),
		defaultEffort: ReasoningEffortId(declared)
	};
}
//#endregion
//#region src/translate.ts
/** 已知事件名（stream 只接受这些；未知事件若巧合携带同名字段再宽容处理）。 */
const KNOWN = /* @__PURE__ */ new Set([
	"response.output_item.added",
	"response.output_item.done",
	"response.output_text.delta",
	"response.reasoning_text.delta",
	"response.reasoning_summary_text.delta",
	"response.function_call_arguments.delta",
	"response.completed",
	"response.failed",
	"error"
]);
/** 是否需要流式（服务端未给流式事件时，只要 `data` 是对象框就解析）。 */
function frameToEvent(frame) {
	const raw = frame.data.trim();
	if (raw === "") return void 0;
	let payload;
	try {
		payload = JSON.parse(raw);
	} catch {
		return;
	}
	if (payload === null || typeof payload !== "object") return void 0;
	const p = payload;
	const type = typeof p.type === "string" ? p.type : frame.event;
	if (type === "response.output_item.added" || type === "response.output_item.done") return {
		event: type,
		item: p.item ?? {}
	};
	if (type === "response.output_text.delta") return {
		event: type,
		item_id: String(p.item_id ?? ""),
		content_part_index: Number(p.content_part_index ?? -1),
		delta: String(p.delta ?? "")
	};
	if (type === "response.reasoning_text.delta" || type === "response.reasoning_summary_text.delta") return {
		event: type,
		item_id: String(p.item_id ?? ""),
		delta: String(p.delta ?? "")
	};
	if (type === "response.function_call_arguments.delta") return {
		event: type,
		item_id: String(p.item_id ?? ""),
		delta: String(p.delta ?? "")
	};
	if (type === "response.completed") return {
		event: type,
		response: p.response ?? {}
	};
	if (type === "response.failed" || type === "error") return {
		event: type,
		response: p.response ?? p
	};
}
/** 把 wire usage 翻译为 dsh `TokenUsage`（total 仅在 wire 给出时携带）。 */
function mapUsage(usage) {
	return {
		inputTokens: usage.input_tokens ?? 0,
		outputTokens: usage.output_tokens ?? 0,
		...usage.total_tokens === void 0 ? {} : { totalTokens: usage.total_tokens }
	};
}
/** 闭合槽位 → 终态 `ContentBlock`（工具参数始终是 RAW JSON 字符串）。 */
function closeBlock(slot) {
	if (slot.kind === "tool-call") return {
		type: "tool-call",
		id: slot.callId ?? slot.id ?? "",
		name: slot.name ?? "",
		arguments: slot.text
	};
	if (slot.kind === "reasoning") return {
		type: "reasoning",
		text: slot.text
	};
	return {
		type: "text",
		text: slot.text
	};
}
/** 取分段数组里所有 `text` 拼接（reasoning item 的 `content` / `summary` 分段）。 */
function joinText(parts) {
	if (parts === void 0) return "";
	return parts.map((part) => part.text ?? "").join("");
}
/**
* 闭合态 reasoning item 的全文回落位：vLLM 的 `/v1/responses` 把全文放在
* `content: [{ type: 'reasoning_text', text }]`，OpenAI 放在 `summary: [{ type:
* 'summary_text', text }]`——两处都认，取先有值的那个。
*/
function reasoningItemText(item) {
	const content = joinText(item.content);
	return content.length > 0 ? content : joinText(item.summary);
}
/** reasoning 槽的键前缀（与 message 槽的 `${id}:${partIndex}` 键位区分）。 */
const REASONING_KEY = "reasoning:";
/**
* 把 Responses 事件帧流翻译成 `StreamChunk`。持有跨事件的 index/缓冲状态，且在
* 见过 `finish`（`response.completed`/`response.failed`）后不再产出任何 chunk。
*/
var ResponsesTranslator = class {
	slots = /* @__PURE__ */ new Map();
	/** 按首见顺序记录全部块，供终止事件前兜底闭合（网关漏发 `output_item.done` 时不丢内容）。 */
	order = [];
	nextIndex = 0;
	finished = false;
	sawToolCall = false;
	failure;
	/** 开一个新块槽（index 按首见顺序分配，尚未闭合）。 */
	open(kind, fields = {}) {
		const slot = {
			index: this.nextIndex++,
			kind,
			text: "",
			name: fields.name,
			id: fields.id,
			callId: fields.callId,
			closed: false
		};
		this.order.push(slot);
		return slot;
	}
	/** 取（必要时新建）某个 reasoning item 的槽位；`opened` = 本次新建（调用方据此发 block-start）。 */
	ensureReasoning(itemId) {
		const key = `${REASONING_KEY}${itemId}`;
		const existing = this.slots.get(key);
		if (existing !== void 0) return {
			slot: existing,
			opened: false
		};
		const slot = this.open("reasoning", { id: itemId });
		this.slots.set(key, slot);
		return {
			slot,
			opened: true
		};
	}
	/** 闭合一个已缓冲的槽（幂等：重复 done 只发第一次）。 */
	close(slot, block) {
		if (slot.closed) return [];
		slot.closed = true;
		return [{
			type: "block-end",
			index: slot.index,
			block: block ?? closeBlock(slot)
		}];
	}
	/** 兜底闭合：按首见顺序补齐尚未闭合的块（空 text/reasoning 块不发）。 */
	flush() {
		const out = [];
		for (const slot of this.order) {
			if (slot.closed) continue;
			if (slot.kind !== "tool-call" && slot.text.length === 0) {
				slot.closed = true;
				continue;
			}
			out.push(...this.close(slot));
		}
		return out;
	}
	/** 喂一帧，返回本次应发出的 `StreamChunk`（可能为空数组）。 */
	push(frame) {
		if (this.finished) return [];
		const event = frameToEvent(frame);
		if (event === void 0) return [];
		if (!KNOWN.has(event.event)) return [];
		return this.apply(event);
	}
	apply(event) {
		if (this.finished) return [];
		switch (event.event) {
			case "response.output_item.added": {
				const item = event.item;
				if (item.type === "function_call") {
					this.sawToolCall = true;
					const key = item.id ?? item.call_id ?? `fc-${this.nextIndex}`;
					const slot = this.open("tool-call", {
						name: item.name,
						id: item.id,
						callId: item.call_id
					});
					this.slots.set(key, slot);
					const chunks = [{
						type: "block-start",
						index: slot.index,
						blockType: "tool-call"
					}];
					if (item.name) chunks.push({
						type: "tool-call-delta",
						index: slot.index,
						id: item.call_id ?? "",
						name: item.name,
						argumentsDelta: ""
					});
					return chunks;
				}
				if (item.type === "reasoning") {
					const { slot, opened } = this.ensureReasoning(item.id ?? "");
					return opened ? [{
						type: "block-start",
						index: slot.index,
						blockType: "reasoning"
					}] : [];
				}
				return [];
			}
			case "response.output_item.done": {
				const item = event.item;
				if (item.type === "function_call") {
					const key = item.id ?? item.call_id ?? "";
					const slot = this.slots.get(key);
					if (slot === void 0) return [];
					const block = {
						type: "tool-call",
						id: item.call_id ?? item.id ?? "",
						name: item.name ?? slot.name ?? "",
						arguments: item.arguments ?? slot.text
					};
					return this.close(slot, block);
				}
				if (item.type === "reasoning") {
					const { slot, opened } = this.ensureReasoning(item.id ?? "");
					const text = slot.text.length > 0 ? slot.text : reasoningItemText(item);
					if (opened && text.length === 0) return [];
					return this.close(slot, {
						type: "reasoning",
						text
					});
				}
				const parts = item.content ?? [];
				const out = [];
				for (const part of parts) {
					if (part.type !== "output_text") continue;
					const key = `${item.id ?? ""}:${parts.indexOf(part)}`;
					const slot = this.slots.get(key);
					if (slot === void 0) continue;
					out.push(...this.close(slot, {
						type: "text",
						text: slot.text
					}));
				}
				return out;
			}
			case "response.output_text.delta": {
				const key = `${event.item_id}:${event.content_part_index}`;
				let slot = this.slots.get(key);
				if (slot === void 0) {
					slot = this.open("text");
					this.slots.set(key, slot);
					this.slots.set(event.item_id, slot);
					const first = [{
						type: "block-start",
						index: slot.index,
						blockType: "text"
					}];
					if (event.delta) first.push({
						type: "text-delta",
						index: slot.index,
						text: event.delta
					});
					slot.text += event.delta;
					return first;
				}
				if (slot.kind !== "tool-call") {
					slot.text += event.delta;
					return event.delta ? [{
						type: "text-delta",
						index: slot.index,
						text: event.delta
					}] : [];
				}
				return [];
			}
			case "response.reasoning_text.delta":
			case "response.reasoning_summary_text.delta": {
				const { slot, opened } = this.ensureReasoning(event.item_id);
				const chunks = opened ? [{
					type: "block-start",
					index: slot.index,
					blockType: "reasoning"
				}] : [];
				if (!slot.closed && event.delta) {
					slot.text += event.delta;
					chunks.push({
						type: "reasoning-delta",
						index: slot.index,
						text: event.delta
					});
				}
				return chunks;
			}
			case "response.function_call_arguments.delta": {
				const slot = this.slots.get(event.item_id);
				if (slot === void 0 || slot.kind !== "tool-call") return [];
				slot.text += event.delta;
				return [{
					type: "tool-call-delta",
					index: slot.index,
					id: slot.callId ?? "",
					argumentsDelta: event.delta
				}];
			}
			case "response.completed": {
				const usage = event.response.usage;
				const chunks = this.flush();
				if (usage) chunks.push({
					type: "usage",
					usage: mapUsage(usage)
				});
				const reason = this.sawToolCall ? "tool-calls" : "stop";
				chunks.push({
					type: "finish",
					reason: { kind: reason }
				});
				this.finished = true;
				return chunks;
			}
			case "response.failed":
			case "error": {
				const failure = event.response?.error;
				this.failure = {
					message: failure?.message ?? "the provider response failed",
					code: failure?.code ?? "PROVIDER_ERROR"
				};
				const chunks = [{
					type: "finish",
					reason: {
						kind: "error",
						failure: this.failure
					}
				}];
				this.finished = true;
				return chunks;
			}
			default: return [];
		}
	}
	/** 已进入终止状态？供 adapter 在流结束时核对（finish 后不得再 emit）。 */
	get isFinished() {
		return this.finished;
	}
};
//#endregion
//#region src/adapter.ts
/**
* `@tpt-work/llm-tpt` 的 Responses 风格 adapter：fetch + SSE 对接 OpenAI Responses 网关
* （`POST {baseURL}{responsesPath}`，`stream:true`），产出 harness `StreamChunk`。adapter 是
* **纯传输**：连接事实（档案）经 thunk 每操作读取、Bearer 经每请求解析器解析——校验、分层与
* 凭据策略归注册插件（index.ts）所有（对齐 dsh 官方 `dsh-llm-deepseek` 的 adapter 定位）。
*
* 请求拼接与 SSE 解析分层：`serialize.ts` 拼请求体、`sse.ts` 切帧、`translate.ts` 把事件
* 翻译成 `StreamChunk`；模型目录获取（多 URL 故障转移 + 富字段解析）在 `catalog.ts`，本模块
* 与它共用 URL 列表解析与故障转移判据。每个 HTTP 请求头都带 `attributionHeaders()`
* （dsh 强制）。`baseURL` 支持多个（换行/逗号/分号/空白分隔，按序用能通的，语义见 catalog.ts）。
*
* 与蓝本（旧包 `@tpt-work/llm-tpt` 的已验证实现）的差异：连接事实来自 profile（settings
* 权威来源，key 经凭据异步解析）；SSE 帧切片修正了蓝本的一处死锁；并新增 pi-ai 同款能力的自有
* 实现——思考档位映射（`reasoningEfforts` → `reasoning.effort`，档位表/默认档/显示名的归一化
* 权威来源在 `reasoning.ts`）、图像输入（attachments
* 服务 → `input_image` 数据 URL）、自定义请求头、请求超时与流空闲看门狗、retryPolicy 挂钩、
* modelOverrides、多语模型显示名（`model_name` 按当前语种解析）。
*
* @module @tpt-work/llm-tpt/adapter
*/
/** 档案缺省的上下文窗口（models 条目未声明容量时回落）。 */
const DEFAULT_CONTEXT_WINDOW = 262144;
/** 档案缺省的每请求输出上限（models 条目未声明容量时回落）。 */
const DEFAULT_MAX_TOKENS = 32768;
/** 请求侧图像编码的像素预算（attachments.readImageRequest 的 policy，默认对齐 pi-ai 先例）。 */
const DEFAULT_IMAGE_PIXEL_BUDGET = 4194304;
/** 请求侧图像编码的字节预算（attachments.readImageRequest 的 policy，默认对齐 pi-ai 先例）。 */
const DEFAULT_IMAGE_MAX_BYTES = 1048576;
/** 流式空闲超时（毫秒）：一个 SSE 帧都读不到的最大时长，超时中止（对齐 pi-ai 缺省 3e5）。 */
const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 3e5;
/** 图像数据 URL（OpenAI Responses `input_image` 的 image_url 形态）。 */
function imageDataUrl(image) {
	return `data:${image.mediaType};base64,${Buffer.from(image.data).toString("base64")}`;
}
/**
* 有效输入模态解析（**恒有值**，对齐 dsh-llm-deepseek 的 `modelInfo`/`modelInfoFor` 恒回报
* `inputModalities ?? ["text"]`）：effective 声明了非空的 `input` 用之；否则回落档案
* `defaultInput`（缺省 `['text']`）。`listModels` / `resolveModel` / `stream` 的三处消费共用，
* 保证 harness 按 `resolveModelInfo().inputModalities` 的图片准入门禁与界面能力永远看得到可信值。
*/
function effectiveInputFor(profile, input) {
	return input !== void 0 && input.length > 0 ? input : profile.defaultInput ?? ["text"];
}
/** 适用「空值不覆盖」的集合字段（`reasoningEfforts` 的 `false` 是显式声明，不在其列）。 */
const INHERIT_WHEN_EMPTY = [
	"input",
	"reasoningEfforts",
	"reasoningEffortNames"
];
/** 「空 = 未声明」判据：`undefined`、空数组、空对象；`false`（剥档位）与任何标量都算声明过。 */
function isEmptyDeclaration(value) {
	if (value === void 0) return true;
	if (Array.isArray(value)) return value.length === 0;
	if (typeof value === "object" && value !== null) return Object.keys(value).length === 0;
	return false;
}
/** 集合字段的回填点（键在运行期是变量，窄化交给这一处断言）。 */
function assignCollection(target, key, value) {
	target[key] = value;
}
/**
* OpenAI 兼容 Responses 网关 adapter（TPT 席位自有实现）。一个实例服务注册给它的所有模型名
* （harness 模型名就是 wire 模型名）。
*/
var TptAdapter = class extends LlmAdapter {
	options;
	constructor(options) {
		super();
		this.options = options;
	}
	providerInfo(provider) {
		return {
			id: provider,
			name: this.options.resolveProfile().displayName ?? "TPT"
		};
	}
	/** 模型显示名语种（model_name 的取名键；未接钩子时回落产品主语种 zh）。 */
	locale() {
		return this.options.resolveLocale?.() ?? "zh";
	}
	/** 档案 retryPolicy 交给 dsh-llm-retry 执行（未配置走其默认的 bounded 策略）。 */
	providerRetryPolicy(provider) {
		return resolveRetryPolicy(this.options.resolveProfile().retryPolicy, "llm-tpt");
	}
	/** models 条目 + modelOverrides 合成出的有效模型描述（override 字段优先；id 恒有值）。 */
	declaredModel(profile, model) {
		const base = (profile.models ?? []).find((entry) => entry.id === model);
		const override = profile.modelOverrides?.[model];
		if (base === void 0 && override === void 0) return void 0;
		const merged = {
			id: model,
			...base,
			...override
		};
		if (base !== void 0 && override !== void 0) for (const key of INHERIT_WHEN_EMPTY) {
			if (!isEmptyDeclaration(override[key])) continue;
			const declared = base[key];
			if (!isEmptyDeclaration(declared)) assignCollection(merged, key, declared);
		}
		return merged;
	}
	async listModels(provider) {
		const profile = this.options.resolveProfile();
		const locale = this.locale();
		return (profile.models ?? []).map((model) => {
			const effective = this.declaredModel(profile, model.id) ?? model;
			return {
				provider,
				id: model.id,
				name: displayNameFor(effective, locale),
				...typeof effective.description === "string" ? { description: effective.description } : {},
				inputModalities: effectiveInputFor(profile, effective.input)
			};
		});
	}
	async resolveModel(provider, model) {
		const profile = this.options.resolveProfile();
		const effective = this.declaredModel(profile, model);
		const contextWindow = effective?.contextWindow ?? profile.defaultContextWindow ?? 262144;
		const defaultMaxTokens = effective?.maxTokens ?? profile.defaultMaxTokens;
		const reasoning = effective === void 0 ? void 0 : buildReasoningInfo(effective, profile, (fact) => this.options.log?.(`TPT reasoning capability for "${model}": ${fact}`));
		return {
			provider,
			id: model,
			name: effective === void 0 ? model : displayNameFor(effective, this.locale()),
			...typeof effective?.description === "string" ? { description: effective.description } : {},
			context: { contextWindow },
			...defaultMaxTokens === void 0 ? {} : { defaultMaxTokens },
			...reasoning === void 0 ? {} : { reasoning },
			inputModalities: effectiveInputFor(profile, effective?.input)
		};
	}
	/** 消息里的图像引用（按 attachmentId 去重）。 */
	imageRefs(options) {
		const refs = [];
		const seen = /* @__PURE__ */ new Set();
		for (const message of options.messages) for (const block of message.content) if (block.type === "image" && !seen.has(block.attachment.attachmentId)) {
			seen.add(block.attachment.attachmentId);
			refs.push(block.attachment);
		}
		return refs;
	}
	/** 解析请求图像 → attachmentId → 数据 URL 表（含图像块但服务缺失时抛 UNSUPPORTED_CONTENT）。 */
	async resolveRequestImages(options, profile) {
		if (!options.messages.some((message) => contentHasImage(message.content))) return /* @__PURE__ */ new Map();
		const attachments = this.options.resolveAttachments?.();
		if (attachments === void 0) {
			this.options.log?.("TPT request carries image input but the durable attachment service is unavailable");
			throw new LlmError("当前环境不支持图片输入。", "UNSUPPORTED_CONTENT");
		}
		const policy = {
			maxPixels: profile.requestImagePixelBudget ?? 4194304,
			maxBytes: profile.requestImageMaxBytes ?? 1048576
		};
		const images = /* @__PURE__ */ new Map();
		for (const ref of this.imageRefs(options)) {
			const image = await attachments.readImageRequest(ref, policy, options.signal);
			images.set(ref.attachmentId, imageDataUrl(image));
		}
		return images;
	}
	/** 选中思考档位的 wire 串：模型 reasoningEfforts 映射里查 GenerateOptions.reasoningEffort。 */
	reasoningWire(options, profile) {
		if (options.reasoningEffort === void 0) return void 0;
		const declared = this.declaredModel(profile, options.model);
		if (declared === void 0) return void 0;
		const wire = effectiveEffortMap(declared)?.[String(options.reasoningEffort)];
		return typeof wire === "string" ? wire : void 0;
	}
	async *stream(options) {
		const profile = this.options.resolveProfile();
		if (options.messages.some((message) => contentHasImage(message.content))) {
			if (!effectiveInputFor(profile, this.declaredModel(profile, options.model)?.input).includes("image")) {
				this.options.log?.(`TPT model "${options.model}" does not accept image input`);
				throw new LlmError("当前模型不支持图片输入，请更换模型或移除此图像。", "UNSUPPORTED_CONTENT");
			}
		}
		const body = serializeRequest(options, profile, await this.resolveRequestImages(options, profile), this.reasoningWire(options, profile));
		const apiKey = await this.options.resolveApiKey();
		if (apiKey === void 0) throw new LlmError(MISSING_KEY_MESSAGE, "MISSING_CREDENTIAL");
		const candidates = parseBaseURLs(profile.baseURL);
		if (candidates.length === 0) {
			this.options.log?.("TPT streaming has no gateway URL to try (check `baseURL` in the llm-tpt settings section)");
			throw new LlmError(NO_GATEWAY_MESSAGE, "PROVIDER_ERROR");
		}
		const responsesPath = gatewayPath(profile.responsesPath, "/responses");
		const signal = options.signal;
		const failures = [];
		for (const baseURL of candidates) {
			const url = `${baseURL.replace(/\/+$/, "")}${responsesPath}`;
			const controller = new AbortController();
			const onAbort = () => {
				controller.abort();
			};
			if (signal !== void 0) {
				if (signal.aborted) throw new LlmError("the request was aborted", "ABORTED");
				signal.addEventListener("abort", onAbort, { once: true });
			}
			try {
				const timeoutMs = profile.timeoutMs;
				const timeout = timeoutMs !== void 0 && timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : void 0;
				let response;
				try {
					response = await fetch(url, {
						method: "POST",
						headers: {
							"content-type": "application/json",
							authorization: `Bearer ${apiKey}`,
							...attributionHeaders(),
							...profile.headers
						},
						body: JSON.stringify(body),
						signal: controller.signal
					});
				} catch (error) {
					if (signal?.aborted === true) throw new LlmError("the request was aborted", "ABORTED");
					const reason = error instanceof Error ? error.message : String(error);
					failures.push(`${url} (${reason})`);
					this.options.log?.("TPT responses attempt failed at transport", {
						url,
						reason
					});
					continue;
				} finally {
					if (timeout !== void 0) clearTimeout(timeout);
				}
				if (!response.ok) {
					if (response.status >= 500 || response.status === 404) {
						failures.push(`${url} (HTTP ${response.status})`);
						this.options.log?.("TPT responses attempt is not serviceable, moving on", {
							url,
							status: response.status
						});
						continue;
					}
					const detail = await response.text().catch(() => "");
					this.options.log?.("TPT responses gateway rejected the request", {
						url,
						status: response.status,
						body: detail.slice(0, 300)
					});
					throw new LlmError(response.status === 401 || response.status === 403 ? "TPT 模型网关拒绝了本次请求，请检查 API 密钥后重试。" : "TPT 模型网关未能应答本次请求，请稍后重试。", response.status === 401 || response.status === 403 ? "AUTH" : "PROVIDER_ERROR", { status: response.status });
				}
				if (response.body === null) {
					failures.push(`${url} (empty stream body)`);
					this.options.log?.("TPT responses attempt returned an empty stream body", { url });
					continue;
				}
				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				const translator = new ResponsesTranslator();
				const idleMs = profile.streamIdleTimeoutMs ?? 3e5;
				let buffer = "";
				try {
					while (true) {
						const idle = setTimeout(() => controller.abort(), idleMs);
						let read;
						try {
							read = await reader.read();
						} finally {
							clearTimeout(idle);
						}
						if (read.done) break;
						buffer += decoder.decode(read.value, { stream: true });
						const frames = splitFrames(buffer);
						buffer = frames.rest;
						for (const frame of frames.frames) for (const chunk of translator.push(frame)) yield chunk;
					}
				} catch (error) {
					if (signal?.aborted === true) throw new LlmError("the request was aborted", "ABORTED");
					if (controller.signal.aborted) {
						this.options.log?.("TPT responses stream went idle", {
							url,
							idleMs
						});
						throw new LlmError("TPT 模型网关响应超时，请稍后重试。", "PROVIDER_ERROR");
					}
					this.options.log?.("TPT responses stream failed", {
						url,
						error: error instanceof Error ? error.message : String(error)
					});
					throw error instanceof LlmError ? error : new LlmError("TPT 模型网关应答异常，请稍后重试。", "PROVIDER_ERROR");
				} finally {
					reader.releaseLock();
				}
				if (!translator.isFinished) {
					this.options.log?.("TPT responses stream ended without a terminal event", { url });
					yield {
						type: "finish",
						reason: {
							kind: "error",
							failure: {
								message: "TPT 模型网关应答不完整，请稍后重试。",
								code: "PROVIDER_ERROR"
							}
						}
					};
				}
				return;
			} finally {
				if (signal !== void 0) signal.removeEventListener("abort", onAbort);
				controller.abort();
			}
		}
		this.options.log?.(`TPT responses gateway exhausted all ${candidates.length} URL(s)`, { failures });
		throw new LlmError("TPT 模型网关暂时无法连接，请稍后重试。", "PROVIDER_ERROR");
	}
};
//#endregion
//#region src/index.ts
/** 插件名（cordis 插件模块三件套之一，与装配层的挂载 id 对齐）。 */
const name = "llm-tpt";
/** 依赖服务：段读取走 `settings`，adapter/发现注册与调用走 `llm`，默认模型读写走 `agentDefaultModel`，key 解析走 `credentials`。 */
const inject = [
	"settings",
	"llm",
	"agentDefaultModel",
	"credentials"
];
const MODEL_MODALITIES = ["text", "image"];
const THINKING_LEVELS = [
	"off",
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
	"max"
];
const modelEntry = Schema.object({
	id: Schema.string().required(),
	/** 静态单语名（目录获取时 = `model_name.zh ?? 网关 name ?? id`，见 catalog.parseGatewayRow）。 */
	name: Schema.string(),
	/** 多语显示名（键 = 语种 id 如 zh/en）；界面按激活语种解析，链 = `model_name[locale] ?? name ?? id`。 */
	model_name: Schema.dict(Schema.string()),
	/** 网关侧默认模型标记；目录获取成功后由 adoptGatewayDefault 对齐 `agent-default-model`。 */
	is_default: Schema.boolean(),
	/** 用户可见的模型简介（对齐 llm-deepseek 目录条目的 description，透传到 listModels/resolveModel）。 */
	description: Schema.string(),
	contextWindow: Schema.number().min(1),
	maxTokens: Schema.number().min(1),
	/** pi-ai 同名字段：模型声明接受的输入模态；含 image 时 composer 出图片入口。 */
	input: Schema.array(Schema.union([...MODEL_MODALITIES])),
	/**
	* 思考档位映射：键 = 档位 id（匹配 GenerateOptions.reasoningEffort），值 = 发给网关的
	* wire 串；`null`（YAML `off:` 空值）= 该档位不携带 reasoning 字段。**`false` = 声明该模型
	* 无思考能力**（pi-ai 同名写法），用于剥掉网关自报的档位；空表不算剥离（空 = 未声明，
	* 继承基座，见 `adapter.declaredModel`）。语义与默认档/显示名归一化权威来源在 `reasoning.ts`。
	*/
	reasoningEfforts: Schema.union([Schema.dict(Schema.union([Schema.string(), Schema.const(null)])), Schema.const(false)]),
	/**
	* 模型级**默认思考档**（须是本条目档位表里的键；写 `off` 合法 = 默认不思考）。命不中只留痕
	* 不抛错。缺省时按分层策略解析：本字段 > 档案 `thinkingPreference` > 档案 `reasoning` >
	* 内置「最高非 off 档」兜底（`reasoning.resolveDefaultEffort`）。
	*/
	defaultReasoningEffort: Schema.string(),
	/** 档位显示名（档位 id → 名字，**不分语种**：思考档位统一英文，需求方裁定）；缺省落内置英文标签。 */
	reasoningEffortNames: Schema.dict(Schema.string()),
	/** pi-ai 同名字段：协议方言开关（本 adapter 当前不消费，接受以保配置层兼容）。 */
	compat: Schema.dict(Schema.union([
		Schema.string(),
		Schema.boolean(),
		Schema.number()
	]))
});
/**
* 内置静态默认模型目录（对齐 llm-deepseek 的 `Config.models.default(DEFAULT_MODELS)`）：
* 未显式声明 `models` 时出厂自带，`listModels` 恒非空、不依赖外部装配 seed。**它只服务目录
* 获取前的离线解析**（boot 期种子按稳定名落到 id、`listModels`/`resolveModel` 的兜底读数）；
* 获取成功后整表替换成网关本次应答。
*
* **出厂只放一条**（需求方 2026-09-29 收敛口径：「默认只有一个就是轻量」）：`{id:"ds-flash",
* model_name:{zh:"轻量",en:"flash"}, is_default:true, contextWindow:256000, maxTokens:32000,
* think_levels:[off,low,medium,high]}` —— 即当日 TPT responses 网关（tpt-work-router）live
* `/v1/models` 里的出厂默认那条（**容量两键按网关声明值原样写**：`context_window` 256000 与
* `max_output_tokens` 32000），也是装配 `agent-default-model.model: 轻量` 的解析目标。
*
* ⚠ 网关当日 live 另有一条 `qwen-flash`（`{zh:"高级",en:"pro"}`，`think_levels` 含 `xhigh`，
* 自报 `modalities.input:[text,image]`）——**刻意不进本表**：它不随安装包分发，只在「获取模型」
* 成功后由网关应答带入（采纳 = 整表替换，见 refreshCatalog/adoptGatewayDefault）。⇒ 未获取过
* 目录的实例选择器里只有「轻量」；已采纳过的实例看的是自己那份用户层目录。
*
* ⚠ 旧值 `my-flash` 已下线（网关不再有该 id）：留着它会让干净席位的种子解析写出无效 id ⇒
* 目录获取前每轮请求 502、界面退化成裸 `tpt-official/my-flash`。
*
* 条目内置思考档位 `reasoningEfforts`（键 = 档位 id，值 = 发网关 `reasoning.effort` 的 wire 串；
* `off: null` = 该档不携带 reasoning 字段）。**刻意不写默认档**：默认思考档由分层策略解析出来
* （`{off,low,medium,high}` → `high`），证明零配置即成立；想改档写
* `modelOverrides.<id>.defaultReasoningEffort`。装配 seed 不声明 `models`（目录 = 本常量）：
* `input` 出厂不带（`qwen-flash` 那条的网关行自报 `text+image`，但该网关带 `input_image` 的请求
* 仍一律 400 —— 见 bug-fix/llm-tpt-assistant-history-400；未真机验证不硬编码视觉能力，口径见
* bug-fix/llm-tpt-image-capability-propagation），由采纳时提供（缺省回落 `defaultInput`）；
* `description` 仅 schema 收下，当前无写入源（catalog.parseGatewayRow 不解析它）。**容量写**：
* 采纳后两键都直接取网关声明（`context_window` / `max_output_tokens`，回落 `max_model_len` /
* `maxTokens`）；目录获取前这段离线窗口用的就是本表这两个数——少了 `maxTokens`，干净席位的
* 请求体会发档案缺省 32768，**超出网关声明的 32000**（`implementation/llm-tpt-catalog-fetch-and-multi-url`
* 的容量字段三形节有成因与读数）。
*/
const DEFAULT_MODELS = [{
	id: "ds-flash",
	name: "轻量",
	model_name: {
		zh: "轻量",
		en: "flash"
	},
	is_default: true,
	contextWindow: 256e3,
	maxTokens: 32e3,
	reasoningEfforts: {
		off: null,
		low: "low",
		medium: "medium",
		high: "high"
	}
}];
/**
* 档案 schema（条目与 llm-pi-ai profile 全集对齐）。`api` 用单成员 union（schemastery
* 无 `literal`；原语成员经 `Schema.from` 折成 `const().required()`，即字面量收窄）+ default。
*
* ⚠ **两处刻意，改前先读**（2026-09-29）：
* ① **不写 `z<TptProfile>` 标注**：`models` 带 `.volatile()`（理由见下），volatile 字段把对象 schema
*    的 `meta.default` 变成 `Volatile<…>` ⇒ 标注会红 TS2375（同 `@tpt-work/settings-tpt` 的
*    `settings-schema.ts`）。
* ② **也不留空让它推断**：本 schema 有几处 `z.dict(...)`，推断出的类型会引用 cosmokit 的 `Dict`
*    ⇒ 导出声明报 TS2883「不可移植」。⇒ 取最窄的可用标注 `z`，取值形状由
*    {@link parseTptProfile} 收口成 `TptProfile`（volatile 引用也在那一跳解开）。
*/
const Config = Schema.object({
	apiKeyEnv: Schema.string().role("credential-ref").default(TPT_API_KEY_REF),
	displayName: Schema.string().default("TPT"),
	api: Schema.union(["openai-responses"]).default("openai-responses"),
	/** 网关地址，支持多个（换行/逗号/分号/空白分隔，书写顺序 = 尝试顺序，见 catalog.ts）。 */
	baseURL: Schema.string(),
	modelsPath: Schema.string().default("/models"),
	responsesPath: Schema.string().default("/responses"),
	models: Schema.array(modelEntry).default(DEFAULT_MODELS).volatile(),
	/** pi-ai 同名字段：按模型 id 覆盖/补充 models 条目（override 字段优先）。 */
	modelOverrides: Schema.dict(modelEntry).default({}),
	defaultContextWindow: Schema.number().min(1).default(DEFAULT_CONTEXT_WINDOW),
	defaultMaxTokens: Schema.number().min(1).default(DEFAULT_MAX_TOKENS),
	defaultInput: Schema.array(Schema.union([...MODEL_MODALITIES])).default(["text"]),
	/**
	* 默认模型的稳定名（id 亦可）：目录获取后按名解析成网关当前 id，网关 id 漂移免追改
	*。缺省（未声明）= 不参与解析，沿用 is_default/首行兜底。匹配规则
	* （id → name → model_name 任一语种值，精确相等行序首中）见 `matchModelEntryByKey`。
	*/
	defaultModelName: Schema.string(),
	/** 自定义请求头（stream 与模型发现都附带；在 Bearer/attribution 之后追加，可覆盖）。 */
	headers: Schema.dict(Schema.string()).default({}),
	/**
	* 档案级默认思考档位（pi-ai 对齐字段，词表固定 7 档）：模型未显式声明 `defaultReasoningEffort`
	* 且不在 `thinkingPreference` 命中时参与解析（顺位见 `reasoning.resolveDefaultEffort`）。
	*/
	reasoning: Schema.union([...THINKING_LEVELS]),
	/**
	* 档案级默认思考档**有序偏好列表**（任意词表，`on` 这类网关自报档位写这里）：解析某模型的
	* 默认档时取第一个命中其档位表的档位。都不命中时兜底「最高非 off 档」——**出厂即带默认思考，
	* 且界面不出现上游按 `defaultEffort` 缺席才注入的那栏 `Default`**。
	*/
	thinkingPreference: Schema.array(Schema.string()),
	compat: Schema.dict(Schema.union([
		Schema.string(),
		Schema.boolean(),
		Schema.number()
	])).default({}),
	thinkingBudgets: Schema.dict(Schema.union([
		Schema.string(),
		Schema.boolean(),
		Schema.number()
	])).default({}),
	cacheRetention: Schema.union([
		"none",
		"short",
		"long"
	]),
	transport: Schema.union([
		"sse",
		"websocket",
		"websocket-cached",
		"auto"
	]),
	timeoutMs: Schema.natural(),
	websocketConnectTimeoutMs: Schema.natural(),
	streamIdleTimeoutMs: Schema.number().min(1).default(DEFAULT_STREAM_IDLE_TIMEOUT_MS),
	maxRequestImageBytes: Schema.number().min(1),
	retryPolicy: RetryPolicySchema,
	requestImagePixelBudget: Schema.number().min(1).default(DEFAULT_IMAGE_PIXEL_BUDGET),
	requestImageMaxBytes: Schema.number().min(1).default(DEFAULT_IMAGE_MAX_BYTES),
	/**
	* 仅 schema 载体（数据层恒空，卡片与业务都不读写）：设置模型页的 protocolChoices 按
	* pi-ai 族的 `providers: z.dict(profile)` 形态对 schema 树做 dict 任意键下钻
	* （`['providers', '\0probe', 'api']`），缺这条路径则 API 协议 select 的 options 为空、
	* 锁定后显示空值。union 顺序 openai-responses 在前，与 TPT_PROTOCOLS 先例一致。
	*/
	providers: Schema.dict(Schema.object({ api: Schema.union([
		"openai-responses",
		"openai-completions",
		"anthropic-messages"
	]) })).default({})
});
/**
* serviceability 把关：baseURL 至少解析出一个 URL、models 非空。装配解析（installSection
* 的 validate）与写盘两处共用，拒绝即抛错并命名原因。
*/
function assertServiceable(profile) {
	if (parseBaseURLs(profile.baseURL).length === 0) throw new Error("llm-tpt: needs at least one gateway baseURL (`baseURL` in the llm-tpt settings section; multiple URLs separated by newlines, commas, or spaces)");
	const models = profile.models;
	if (!Array.isArray(models) || models.length === 0) throw new Error("llm-tpt: needs at least one declared model (`models` in the llm-tpt settings section)");
}
/** 默认模型服务的 settings 命名空间。 */
const DEFAULT_MODEL_SETTINGS_NS = "agent-default-model";
/** 段注册/服务就绪的轮询间隔与 boot 窗口总时长（超时静默放弃，下次启动再来）。 */
const RETRY_INTERVAL_MS = 2e3;
const RETRY_DEADLINE_MS = 3e4;
/**
* 落盘一条默认选择（种子解析/削档修复/目录采纳三处写入口径合一）：存量落盘的
* `reasoningEffort` 是当初 saveSelection 写出的 id 串（品牌类型无运行期校验），原值透传回品牌
* 形参只差一个类型断言；saveSelection 落盘前会自行 String() 化。
*/
async function saveSelection(ctx, selection) {
	await ctx.agentDefaultModel.saveSelection({
		provider: selection.provider,
		model: selection.model,
		...selection.reasoningEffort === void 0 ? {} : { reasoningEffort: selection.reasoningEffort }
	});
}
/**
* boot 期种子解析判定（纯函数，返回 undefined = 不写；implementation/llm-tpt-default-model-name-pin）：落盘选择 provider 为本席位
* 且 `model` **不是**生效目录已知 id、但按稳定名命中目录条目（`matchModelEntryByKey`）时，
* 改写为该条目 id。这让装配 `agent-default-model.model` 可以直接写稳定显示名（`轻量`）——
* 名字只活在落盘前，任何会话/目录消费它之前就已被离线解析成 id，不依赖网关可达。其余
* （已是 id / 无法按名解析 / 非本席位 / 无落盘）返回 undefined（幂等不写）。
* 写声明目录里的 id 与写装配 seed id 是同一信任级（随版本维护对齐网关）；目录获取后的解析链
* （gatewayDefaultSelection）才只写网关刚刚应答过的 id。
*/
function resolveSeedSelection(models, selection) {
	if (selection === void 0 || selection.provider !== "tpt-official") return void 0;
	if (models.some((entry) => entry.id === selection.model)) return void 0;
	const matched = matchModelEntryByKey(models, selection.model);
	if (matched === void 0) return void 0;
	const previous = selection.reasoningEffort;
	return {
		provider: TPT_PROVIDER_ROUTE,
		model: matched.id,
		...previous !== void 0 && isEffortOffered(matched, previous) ? { reasoningEffort: previous } : {}
	};
}
/**
* 存量落盘思考档位的**削档修复**（纯函数，返回 undefined = 不写）：provider 是本席位、model
* 是生效目录里的已知 id（种子解析分支管不到这条），但落盘的 `reasoningEffort` 已不在该模型
* **当前**档位表里（网关联调改了用词、或该模型被声明为 `reasoningEfforts: false`）时，写回一条
* 不带档位的默认选择。
*
* 为什么必须修：宿主在把请求交给 adapter **之前**校验档位（`dsh-llm` 的
* `resolveCallWithInfo`），失效档位抛 `UNSUPPORTED_REASONING_EFFORT` ⇒ 该模型的每一轮请求都
* 失败；而旧判定在「模型没变」时幂等早退不写，正是这条漏修的成因。不写档位是安全的：默认档
* 由宿主按 `reasoning.defaultEffort` 物化（并标 `adapterDefaults`，不会被当作用户手选落进
* session header）。**按会话**落盘的旧档位不在本函数范围内（出口 = 用户在 composer 重选一档）。
*/
function repairStaleEffort(models, selection) {
	if (selection === void 0 || selection.provider !== "tpt-official") return void 0;
	const previous = selection.reasoningEffort;
	if (previous === void 0) return void 0;
	const entry = models.find((candidate) => candidate.id === selection.model);
	if (entry === void 0) return void 0;
	if (isEffortOffered(entry, previous)) return void 0;
	return {
		provider: TPT_PROVIDER_ROUTE,
		model: selection.model
	};
}
/** 错误是否为「环境还没就绪/写冲突」类瞬态（值得在本 boot 窗口内重试）。 */
function isTransient(error) {
	if (!(error instanceof Error)) return false;
	if (error.code === "SETTINGS_CONFLICT") return true;
	return error.message.includes("is not registered");
}
function delay(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
/**
* 单次尝试：①稳定名种子解析（implementation/llm-tpt-default-model-name-pin，见 {@link resolveSeedSelection}）②存量思考档位修复
* （见 {@link repairStaleEffort}）。默认模型纯声明式（装配 `agent-default-model` 基座，本插件
* 不再做网络发现落位/自动改写），因此无需等网关。
*/
async function attempt(ctx, profile) {
	const setting = ctx.settings.describe().find((d) => String(d.ns) === DEFAULT_MODEL_SETTINGS_NS)?.value;
	if (setting === void 0) return "retry";
	const selection = setting;
	if (selection === void 0) return "done";
	const models = profile().models ?? [];
	const seeded = resolveSeedSelection(models, selection);
	if (seeded !== void 0) {
		await saveSelection(ctx, seeded);
		ctx.logger.info("llm-tpt: default model seed %s resolved to id %s by name", selection.model, seeded.model);
		return "done";
	}
	const repaired = repairStaleEffort(models, selection);
	if (repaired === void 0) return "done";
	await saveSelection(ctx, repaired);
	ctx.logger.info("llm-tpt: dropped stale default reasoning effort \"%s\" (no longer offered by model %s)", selection.reasoningEffort, repaired.model);
	return "done";
}
/** boot 窗口内的有界重试（等 `agent-default-model` 段注册后做种子解析与削档修复）；超时/永久失败一律静默（info 级留痕），绝不抛出。 */
async function bootstrap(ctx, profile) {
	const deadline = Date.now() + RETRY_DEADLINE_MS;
	while (Date.now() < deadline) {
		try {
			if (await attempt(ctx, profile) === "done") return;
		} catch (error) {
			if (!isTransient(error)) {
				ctx.logger.info("llm-tpt: skipped for this boot (%s)", error instanceof Error ? error.message : String(error));
				return;
			}
		}
		await delay(RETRY_INTERVAL_MS);
	}
	ctx.logger.info("llm-tpt: services not ready within the boot window; will retry next boot");
}
function gatewayDefaultSelection(entries, current, options = {}) {
	if (current !== void 0 && current.provider !== "tpt-official") return void 0;
	const pin = options.pin;
	const pinnedInDeclared = pin !== void 0 ? matchModelEntryByKey(options.declaredModels ?? [], pin) : void 0;
	const preferred = (current !== void 0 ? matchModelEntryByKey(entries, current.model) : void 0) ?? (pin !== void 0 ? matchModelEntryByKey(entries, pin) : void 0) ?? (pinnedInDeclared !== void 0 ? entries.find((entry) => entry.id === pinnedInDeclared.id) : void 0) ?? entries.find((entry) => entry.is_default === true) ?? entries[0];
	if (preferred === void 0) return void 0;
	const previous = current?.reasoningEffort;
	const retained = previous !== void 0 && isEffortOffered(preferred, previous) ? previous : void 0;
	if (current?.model === preferred.id && (previous === void 0 || retained !== void 0)) return void 0;
	return {
		provider: TPT_PROVIDER_ROUTE,
		model: preferred.id,
		...retained === void 0 ? {} : { reasoningEffort: retained }
	};
}
/**
* volatile 指针判据：`{ get() }` 在场 ⇒ 这份配置**已经过一次解析**（schemastery 的 `Schema.resolve`
* 对 volatile 节点返回 `createVolatile(value)` 那个冻结引用，见 `@deepseek-ai/cosmokit`）。
* @param value - 字段的当前值（裸数组 / 指针 / 缺省都可能）。
* @returns 指针本体；不是指针时 undefined。
*/
function volatileRefOf(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return void 0;
	return typeof value.get === "function" ? value : void 0;
}
/**
* 解析一份档案（装配基座 / settings 快照 / loader 交来的配置都走它），把 volatile 字段**两侧**的引用
* 都解开成裸值。
*
* 为什么必须解（2026-09-29 真机缺陷）：`models` 标了 `.volatile()`（写路径的硬要求，见 schema 那一段），
* 而 schemastery 对 volatile 节点返回的是**引用对象**而不是值 ⇒ 不解的话 `profile.models` 拿到的是指针，
* adapter 的 `models.map/find` 当场炸。上游同族做法一致：`dsh-llm-pi-ai` 的 `config.providers.get()`。
*
* **输入侧也要解**，这一条是踩出来的两条真机读数：
* - loader 交给 `apply` 的配置**已经解析过一次**（volatile 字段在那里就是指针）⇒ 再喂给 `Config` 会当场红
*   `$.models expected array but got [object Object]`；
* - 而 `get()` 交回的是**深冻结**副本（`createVolatile` → `snapshot`），拿它重解析时 schemastery 补缺省
*   要写字段 ⇒ 冻结对象上写入即抛。⇒ 指针在场就**只解引用、不重解析**（那份配置本就是解析结果）。
*
* 反过来的那一支（裸对象：装配基座原样、单测直接喂）照旧走 `Config` 校验 + 补缺省，再解输出侧的引用。
* 宿主 `describe()` 那条读数（{@link apply} 里的 `current`）本就被 `plainConfig` 解过引用，三条路径同形。
* @param input - 装配 config（原样或已解析）或 settings 段快照。
* @returns 解析后的档案（volatile 字段已解引用）。
*/
function parseTptProfile(input) {
	const alreadyParsed = volatileRefOf(input.models);
	if (alreadyParsed !== void 0) return {
		...input,
		models: alreadyParsed.get()
	};
	const { models: parsedModels, ...rest } = Config(input);
	const parsedRef = volatileRefOf(parsedModels);
	const models = parsedRef === void 0 ? parsedModels : parsedRef.get();
	return {
		...rest,
		...models === void 0 ? {} : { models }
	};
}
/**
* 从一份 settings 描述值里取 `models` 的裸值。
*
* 宿主 `describe()` 的 `value` 已经过 `plainConfig`（volatile 引用在那里就解开了）⇒ 正常拿到的是裸数组；
* 指针那一支是兜底（同一份数据在别的路径上没解引用时照样能用）。缺省 = 该段还没注册或这颗字段不在。
* @param value - `settings.describe()` 那一条的 `value`。
* @returns 活值里的模型目录；取不到时 undefined。
*/
function liveModelsOf(value) {
	if (value === null || typeof value !== "object") return void 0;
	const raw = value.models;
	if (raw === void 0 || Array.isArray(raw)) return raw;
	return volatileRefOf(raw)?.get();
}
/** 目录获取触发点标签的**可见读数通道**。 */
/**
* 打一行触发点读数。
*
* ⚠ 为什么走 `console` 而不是只走 `ctx.logger`：本装配里**宿主 logger 的读数在开发态终端看不到**
* （宿主的诊断走 stderr，壳把它缓存到失败时才吐 —— 见账本 `implementation/llm-tpt-catalog-fetch-and-multi-url`
* 的「两笔另案」②；真机实测：同一次获取只有 console 那行读得到），而插件 stdout 被壳原样转发
* （`vendor/dsh-desktop/src/host-process.ts` 的 `child.stdout?.pipe(process.stdout)`）⇒ 需求方要按这行
* 核对「什么时候会打网关」（2026-09-29 口径），必须落在可见通道上。前缀与其它随包件的启动读数同族
* （`[tpt-tree]` / `[tpt-sandbox]` / `[tpt-platform-binaries]`）。结构化那几行仍走 `ctx.logger.info`。
* @param line - 一行读数（不含前缀）。
*/
function reportCatalogFetch(line) {
	console.log(`[tpt-llm] ${line}`);
}
function apply(ctx, config) {
	let current = () => parseTptProfile(config ?? {});
	const declaredModels = parseTptProfile(config ?? {}).models ?? [];
	let lastGood;
	const resolveProfile = () => {
		try {
			const next = current();
			lastGood = next;
			return next;
		} catch (error) {
			ctx.logger.error("llm-tpt: keeping the last good profile after an invalid settings section");
			ctx.logger.error(error);
			return lastGood ?? parseTptProfile(config ?? {});
		}
	};
	const resolveApiKey = async () => {
		const ref = resolveProfile().apiKeyEnv ?? "TPT_API_KEY";
		const value = (await ctx.credentials.resolve(ref))?.value;
		return typeof value === "string" && value.length > 0 ? value : void 0;
	};
	/** 档案里有没有可打的网关地址（重试判据与启动触发都用它：没有地址时再试只是往墙上撞）。 */
	const hasGateway = () => parseBaseURLs(resolveProfile().baseURL).length > 0;
	const resolveLocale = () => {
		const preference = (ctx.settings.describe().find((d) => String(d.ns) === "locale")?.value)?.preference;
		return typeof preference === "string" && preference.length > 0 ? preference : "zh";
	};
	/**
	* 诊断日志汇（implementation/llm-tpt-catalog-fetch-and-multi-url 需求方裁定）：**具体事实（网关地址 / HTTP 状态 / 响应体片段 / 空闲
	* 毫秒数）只落宿主日志，绝不进用户可见文案**——上游对非 `AUTH` 的 `LlmError.message` 原样
	* 渲染进对话流，设置卡也直显这段文本，所以脱敏必须在消息生成处完成、细节在这里落地。
	* 内容不含密钥值（Bearer 只在请求头里，从不进这些事实）。
	*/
	const diagnose = (fact, details) => {
		ctx.logger.warn(details === void 0 ? `llm-tpt: ${fact}` : `llm-tpt: ${fact} ${JSON.stringify(details)}`);
	};
	const adapter = new TptAdapter({
		resolveProfile,
		resolveApiKey,
		resolveLocale,
		log: diagnose,
		resolveAttachments: () => ctx.get("attachments")
	});
	/**
	* 默认选择对齐（判定见 {@link gatewayDefaultSelection}，implementation/llm-tpt-catalog-fetch-and-multi-url 两级 + implementation/llm-tpt-default-model-name-pin 名字解析链）：
	* 目录获取成功后按解析链取目标 id（现值有效不 churn ⇒ 现值按名 ⇒ pin 按名 ⇒ pin 两跳 ⇒
	* is_default ⇒ 首行）。写经 `agentDefaultModel.saveSelection`。
	*/
	const adoptGatewayDefault = async (entries) => {
		const selection = ctx.settings.describe().find((d) => String(d.ns) === DEFAULT_MODEL_SETTINGS_NS)?.value;
		const next = gatewayDefaultSelection(entries, selection, {
			pin: resolveProfile().defaultModelName,
			declaredModels
		});
		if (next === void 0) return;
		await saveSelection(ctx, next);
		ctx.logger.info("llm-tpt: default model selection now follows the gateway default (%s)", next.model);
	};
	/** 目录获取 ⇒ 采纳落库 ⇒ 默认选择对齐（解析链见 {@link gatewayDefaultSelection}）。条目为空不写（validate 也会拒空目录）。 */
	const refreshCatalog = async (request, signal) => {
		const entries = await fetchCatalog(request, {
			resolveProfile,
			resolveApiKey,
			log: diagnose,
			...signal === void 0 ? {} : { signal }
		});
		if (entries.length === 0) {
			ctx.logger.info("llm-tpt: the gateway advertised no usable models; keeping the current catalog");
			return entries;
		}
		await ctx.settings.mutate(TPT_SETTINGS_NS, [{
			op: "set",
			path: ["models"],
			value: entries
		}]);
		ctx.logger.info("llm-tpt: adopted %d models from the gateway catalog", entries.length);
		await adoptGatewayDefault(entries);
		return entries;
	};
	let refreshInFlight;
	/** 排着的下一拍重试（同一时刻最多一个）。 */
	let retryTimer;
	/** 重试链是否还开着：成功、终局失败、或插件卸载即收。 */
	let retryArmed = false;
	const stopRetry = () => {
		retryArmed = false;
		if (retryTimer !== void 0) {
			clearTimeout(retryTimer);
			retryTimer = void 0;
		}
	};
	/** 排下一拍重试；已有一拍排着就不叠（节奏恒为「上一拍结束后 30s」）。 */
	const scheduleRetry = () => {
		if (!retryArmed || retryTimer !== void 0) return;
		retryTimer = setTimeout(() => {
			retryTimer = void 0;
			if (!retryArmed) return;
			refreshCatalogShared({}, "retry").catch((error) => {
				ctx.logger.info("llm-tpt: catalog fetch (retry) failed (%s)", error instanceof Error ? error.message : String(error));
			});
		}, CATALOG_RETRY_MS);
		ctx.logger.info("llm-tpt: catalog fetch will retry in %d ms (gateway unreachable)", CATALOG_RETRY_MS);
		reportCatalogFetch(`目录获取失败，${CATALOG_RETRY_MS / 1e3}s 后重试`);
	};
	/** 一次获取的完整生命周期：打标签开跑 ⇒ 成功收链 / 失败按判据排下一拍（或收链并说明原因）。 */
	const runCatalogFetch = async (trigger, request, signal) => {
		ctx.logger.info("llm-tpt: catalog fetch (%s) started", trigger);
		reportCatalogFetch(`模型目录获取（触发点 ${trigger}）`);
		try {
			const entries = await refreshCatalog(request, signal);
			stopRetry();
			reportCatalogFetch(`已采纳 ${entries.length} 个模型（触发点 ${trigger}）`);
			return entries;
		} catch (error) {
			const apiKey = await resolveApiKey();
			if (isRetryableCatalogFailure(error, {
				hasGateway: hasGateway(),
				hasKey: apiKey !== void 0
			})) {
				retryArmed = true;
				scheduleRetry();
			} else {
				stopRetry();
				const reason = error instanceof Error ? error.message : String(error);
				ctx.logger.info("llm-tpt: catalog fetch (%s) will not retry (%s)", trigger, reason);
				reportCatalogFetch(`目录获取失败且不再重试（触发点 ${trigger}）：${reason}`);
			}
			throw error;
		}
	};
	const refreshCatalogShared = (request, trigger, signal) => {
		if (signal === void 0 && refreshInFlight !== void 0) {
			ctx.logger.info("llm-tpt: catalog fetch (%s) joined the in-flight request", trigger);
			reportCatalogFetch(`并入在途的目录获取（触发点 ${trigger}）`);
			return refreshInFlight;
		}
		const promise = runCatalogFetch(trigger, request, signal).finally(() => {
			if (refreshInFlight === promise) refreshInFlight = void 0;
		});
		if (signal === void 0) refreshInFlight = promise;
		return promise;
	};
	ctx.effect(() => () => {
		stopRetry();
	}, "llm-tpt: catalog retry timer");
	ctx.llm.registerAdapter([TPT_PROVIDER_ROUTE], adapter);
	ctx.llm.registerConfigurableProviders([{
		provider: TPT_PROVIDER_ROUTE,
		displayName: "TPT",
		settingsNs: TPT_SETTINGS_NS,
		settingsPath: []
	}]);
	ctx.llm.registerModelDiscovery(TPT_SETTINGS_NS, (request, signal) => refreshCatalogShared(request, "wire", signal).then((entries) => projectDiscovered(entries, resolveLocale())));
	ctx.on("credentials/reference-updated", (ref) => {
		if (ref !== "TPT_API_KEY") return;
		(async () => {
			if (await resolveApiKey() === void 0) return;
			await refreshCatalogShared({}, "credential");
		})().catch((error) => {
			ctx.logger.info("llm-tpt: automatic model catalog refresh skipped (%s)", error instanceof Error ? error.message : String(error));
		});
	});
	current = () => {
		const base = parseTptProfile(config ?? {});
		const live = liveModelsOf(ctx.settings.describe().find((d) => String(d.ns) === TPT_SETTINGS_NS)?.value);
		return live === void 0 ? base : {
			...base,
			models: live
		};
	};
	new TptIdentityService(ctx);
	bootstrap(ctx, resolveProfile).catch((error) => {
		ctx.logger.error("llm-tpt: bootstrap crashed unexpectedly");
		ctx.logger.error(error);
	});
	ctx.effect(() => {
		const timer = setTimeout(() => {
			(async () => {
				if (!hasGateway()) return;
				if (await resolveApiKey() === void 0) return;
				await refreshCatalogShared({}, "boot");
			})().catch((error) => {
				ctx.logger.info("llm-tpt: catalog fetch (boot) skipped (%s)", error instanceof Error ? error.message : String(error));
			});
		}, BOOT_FETCH_DELAY_MS);
		return () => {
			clearTimeout(timer);
		};
	}, "llm-tpt: boot catalog fetch");
}
//#endregion
export { Config, DEFAULT_MODELS, TPT_API_KEY_REF, TPT_PROVIDER_ROUTE, apply, assertServiceable, gatewayDefaultSelection, inject, name, parseBaseURLs, parseTptProfile, repairStaleEffort, resolveSeedSelection };
