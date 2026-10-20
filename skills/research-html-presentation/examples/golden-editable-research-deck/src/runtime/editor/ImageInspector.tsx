"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import type { EditableImageDefinition, EditableTextDefinition } from "./EditPatchTypes";
import { usePresentationEditor } from "./EffectiveContent";

export function ImageInspector({ editId }: { editId: string }) {
  const editor = usePresentationEditor();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const definition = useMemo(() => editor.registry.fields.find((field) => field.editId === editId && field.kind === "image") as EditableImageDefinition | undefined, [editId, editor.registry.fields]);
  const related = useMemo(() => editor.registry.fields.filter((field) => field.targetId === definition?.targetId && field.kind !== "image") as EditableTextDefinition[], [definition?.targetId, editor.registry.fields]);
  if (!definition) return null;
  const effective = editor.values.get(editId);
  const altField = related.find((field) => field.field === "alt");
  const captionField = related.find((field) => field.field === "caption");
  const position = effective?.position ?? definition.baseValue.position ?? { x: 50, y: 50 };
  const size = effective?.size ?? definition.resize?.defaultValue;
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setNotice("");
    try {
      const asset = await editor.uploadImage(file);
      const errors = editor.commitImage(editId, asset);
      setNotice(errors.length ? errors.join("；") : "图片已加入当前修改；保存后写入 Patch。");
    } catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };
  return <fieldset className="presentation-editor-image-inspector" data-editor-panel="true">
    <legend>图片</legend>
    <label>替换<input type="file" accept="image/png,image/jpeg,image/webp,image/avif" disabled={busy} onChange={(event) => void upload(event)} /></label>
    {altField ? <label>替代文本<input type="text" defaultValue={editor.values.get(altField.editId)?.text ?? altField.baseValue} onBlur={(event) => editor.commitText(altField.editId, event.target.value)} /></label> : null}
    {captionField ? <label>图注<input type="text" defaultValue={editor.values.get(captionField.editId)?.text ?? captionField.baseValue} onBlur={(event) => editor.commitText(captionField.editId, event.target.value)} /></label> : null}
    <label>显示<select value={effective?.fit ?? definition.baseValue.fit ?? "contain"} onChange={(event) => editor.commitImageFit(editId, event.target.value as "contain" | "cover")}>
      {(definition.allowedFits ?? ["contain", "cover"]).map((fit) => <option key={fit} value={fit}>{fit}</option>)}
    </select></label>
    <label>X<input type="number" min="0" max="100" value={position.x} onChange={(event) => editor.commitImagePosition(editId, { ...position, x: Number(event.target.value) })} /></label>
    <label>Y<input type="number" min="0" max="100" value={position.y} onChange={(event) => editor.commitImagePosition(editId, { ...position, y: Number(event.target.value) })} /></label>
    {definition.resize ? <>
      <label>宽度<input type="number" min={definition.resize.minWidth} max={definition.resize.maxWidth} step={definition.resize.snap ?? 8} value={size?.width ?? definition.resize.minWidth} onChange={(event) => editor.commitSize(editId, { ...size, width: Number(event.target.value) })} /></label>
      <label>最小高度<input type="number" min={definition.resize.minHeight} max={definition.resize.maxMinHeight} step={definition.resize.snap ?? 8} value={size?.minHeight ?? definition.resize.minHeight} onChange={(event) => editor.commitSize(editId, { ...size, minHeight: Number(event.target.value) })} /></label>
    </> : null}
    <button type="button" onClick={() => editor.resetField(editId, "all")}>恢复原图</button>
    {definition.reviewOnChange || definition.strategy === "evidence-image" ? <small>此图属于科研证据；替换后须重新验证才能正式发布。</small> : null}
    {notice ? <small role="status">{notice}</small> : null}
  </fieldset>;
}
