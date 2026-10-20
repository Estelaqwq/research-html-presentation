"use client";

import { useMemo, type CSSProperties, type ImgHTMLAttributes, type MouseEvent } from "react";
import type { EditableImageDefinition } from "./EditPatchTypes";
import { usePresentationEditor } from "./EffectiveContent";

export function EditableImage({ editId, contentKey, src, alt, className = "", editorLock = false, style, ...props }: ImgHTMLAttributes<HTMLImageElement> & {
  editId?: string;
  contentKey?: string;
  editorLock?: boolean;
}) {
  const editor = usePresentationEditor();
  const definition = useMemo(() => editor.registry.fields.find((field) => field.editId === editId && field.kind === "image") as EditableImageDefinition | undefined, [editId, editor.registry.fields]);
  const effective = editId ? editor.values.get(editId) : undefined;
  const image = effective?.image;
  const selected = Boolean(editId && editor.selectedEditId === editId);
  const size = effective?.size ?? definition?.resize?.defaultValue;
  const effectiveStyle: CSSProperties = {
    ...style,
    ...(definition?.resize?.mode === "report" ? { maxWidth: size?.width } : { width: size?.width }),
    minHeight: size?.minHeight,
    objectFit: effective?.fit ?? (image && "fit" in image ? image.fit : undefined),
    objectPosition: effective?.position ? `${effective.position.x}% ${effective.position.y}%` : undefined,
  };
  return <img
    {...props}
    src={image?.src ?? src}
    alt={(image && "alt" in image ? image.alt : undefined) ?? alt ?? ""}
    className={`${className} ${selected ? "is-selected" : ""}`.trim()}
    style={effectiveStyle}
    data-content-key={contentKey}
    data-edit-id={editId}
    data-edit-kind="image"
    data-editor-component-bound={editId ? "true" : undefined}
    data-editor-lock={editorLock ? "true" : undefined}
    tabIndex={editor.editing && !editorLock ? 0 : props.tabIndex}
    onClick={(event: MouseEvent<HTMLImageElement>) => {
      props.onClick?.(event);
      if (editor.editing && editId && !editorLock) { event.stopPropagation(); editor.select(editId); }
    }}
  />;
}
