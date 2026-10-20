"use client";

import { useEffect, useMemo, useRef, type ClipboardEvent, type CSSProperties, type ElementType, type FormEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { usePresentationEditor } from "./EffectiveContent";

function insertPlainText(value: string) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(value);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function EditableText({ editId, children, as, className = "", ariaLabel }: {
  editId: string;
  children: string;
  as?: ElementType;
  className?: string;
  ariaLabel?: string;
}) {
  const editor = usePresentationEditor();
  const definition = useMemo(() => editor.registry.fields.find((field) => field.editId === editId), [editId, editor.registry.fields]);
  const effective = editor.values.get(editId);
  const value = effective?.text ?? children;
  const selected = editor.selectedEditId === editId;
  const editable = Boolean(editor.available && editor.editing && definition && definition.strategy !== "locked");
  const elementRef = useRef<HTMLElement | null>(null);
  const draftRef = useRef(value);
  const Tag = as ?? "span";

  useEffect(() => {
    draftRef.current = value;
    if (elementRef.current && elementRef.current.textContent !== value && document.activeElement !== elementRef.current) elementRef.current.textContent = value;
  }, [value]);

  if (!definition) return <Tag className={className}>{children}</Tag>;
  const size = effective?.size ?? definition.resize?.defaultValue;
  const sizeStyle: CSSProperties = definition.resize?.mode === "report"
    ? { maxWidth: size?.width, minHeight: size?.minHeight }
    : { width: size?.width, minHeight: size?.minHeight };

  const commit = () => {
    const next = elementRef.current?.textContent ?? draftRef.current;
    const errors = editor.commitText(editId, next);
    if (errors.length && elementRef.current) elementRef.current.textContent = value;
    else draftRef.current = next;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (elementRef.current) elementRef.current.textContent = value;
      elementRef.current?.blur();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      elementRef.current?.blur();
    }
  };

  const onInput = (event: FormEvent<HTMLElement>) => {
    draftRef.current = event.currentTarget.textContent ?? "";
  };

  return (
    <Tag
      ref={(node: HTMLElement | null) => { elementRef.current = node; }}
      className={`editable-text ${selected ? "is-selected" : ""} ${className}`}
      style={sizeStyle}
      data-edit-id={editId}
      data-edit-target-id={definition.targetId}
      data-edit-field={definition.field}
      data-edit-strategy={definition.strategy}
      data-editor-component-bound="true"
      data-editable-size={definition.resize ? "true" : undefined}
      contentEditable={editable}
      suppressContentEditableWarning
      spellCheck={editable}
      tabIndex={editor.editing ? 0 : undefined}
      aria-label={ariaLabel}
      aria-readonly={definition.strategy === "locked" ? true : undefined}
      onClick={(event: MouseEvent<HTMLElement>) => {
        if (!editor.editing) return;
        event.stopPropagation();
        editor.select(editId);
      }}
      onFocus={() => editor.select(editId)}
      onInput={onInput}
      onBlur={commit}
      onKeyDown={onKeyDown}
      onPaste={(event: ClipboardEvent<HTMLElement>) => {
        if (!editable) return;
        event.preventDefault();
        insertPlainText(event.clipboardData?.getData("text/plain") ?? "");
        draftRef.current = elementRef.current?.textContent ?? "";
      }}
      onBeforeInput={(event: FormEvent<HTMLElement>) => {
        if (!editable) return;
        const inputType = (event.nativeEvent as InputEvent).inputType;
        if (inputType === "insertParagraph" || inputType === "insertLineBreak") {
          event.preventDefault();
          insertPlainText("\n");
        } else if (/^(?:insertFromDrop|insertFromPasteAsQuotation|format)/.test(inputType)) event.preventDefault();
      }}
    >
      {value}
    </Tag>
  );
}

export function EditableParagraph({ editId, children, className = "" }: { editId: string; children: string; className?: string }) {
  return <p className={className}><EditableText editId={editId}>{children}</EditableText></p>;
}

export function EditableCopy({ editId, children }: { editId?: string; children: ReactNode }) {
  return editId && typeof children === "string" ? <EditableText editId={editId}>{children}</EditableText> : <>{children}</>;
}
