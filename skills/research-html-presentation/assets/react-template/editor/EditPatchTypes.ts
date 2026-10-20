export type EditOutputMode = "slide-deck" | "scroll-report";
export type EditScope = "shared" | EditOutputMode;
export type EditTextStrategy = "plain-copy" | "evidence-copy" | "locked";
export type EditImageStrategy = "plain-image" | "evidence-image" | "locked";
export type EditStrategy = EditTextStrategy | EditImageStrategy;
export type EditPatchStatus = "clean" | "rebased" | "conflict" | "orphaned";
export type EditReviewStatus = "not-required" | "needs-evidence-review" | "verified";
export type EditOperationName =
  | "replace-text"
  | "set-text-box-size"
  | "set-element-size"
  | "replace-image"
  | "set-image-fit"
  | "set-image-position"
  | "reset-field"
  | "reset-image";
export type EditResetChannel = "text" | "size" | "all";
export type EditImageResetChannel = "source" | "fit" | "position" | "size" | "all";
export type ImageFit = "contain" | "cover";

export type TextBoxSize = { width?: number; minHeight?: number };
export type ImagePosition = { x: number; y: number };

export type ManagedImageAsset = {
  assetId: string;
  src: string;
  sha256: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp" | "image/avif";
  byteSize: number;
  width: number;
  height: number;
};

export type BaseImageValue = {
  src: string;
  alt: string;
  caption?: string;
  sha256?: string;
  mimeType?: ManagedImageAsset["mimeType"];
  byteSize?: number;
  width?: number;
  height?: number;
  fit?: ImageFit;
  position?: ImagePosition;
};

export type EditReview = {
  status: "pending" | "verified";
  verifiedAt?: string;
  verificationId?: string;
  verifiedValueHash?: string;
};

export type EditValidationRequirements = {
  strategy: EditStrategy;
  plainText?: true;
  basisIds?: string[];
  lockedTokens?: string[];
  comparisonTokens?: string[];
  modelSearchAdequacy?: "sufficient" | "limited" | "preliminary" | "not-applicable";
  plainLanguage?: boolean;
  reviewOnChange?: boolean;
  sizeBounds?: { minWidth: number; maxWidth: number; minHeight: number; maxMinHeight: number; snap: number };
};

type OperationBase = {
  operationId: string;
  scope: EditScope;
  targetId: string;
  field: string;
  expectedValueHash: string;
  validation: EditValidationRequirements;
  review?: EditReview;
};

export type ReplaceTextOperation = OperationBase & { operation: "replace-text"; value: string };
export type SetTextBoxSizeOperation = OperationBase & { operation: "set-text-box-size"; value: TextBoxSize };
export type SetElementSizeOperation = OperationBase & { operation: "set-element-size"; value: TextBoxSize };
export type ReplaceImageOperation = OperationBase & { operation: "replace-image"; value: ManagedImageAsset };
export type SetImageFitOperation = OperationBase & { operation: "set-image-fit"; value: ImageFit };
export type SetImagePositionOperation = OperationBase & { operation: "set-image-position"; value: ImagePosition };
export type ResetFieldOperation = OperationBase & { operation: "reset-field"; value: EditResetChannel };
export type ResetImageOperation = OperationBase & { operation: "reset-image"; value: EditImageResetChannel };
export type EditPatchOperation = ReplaceTextOperation | SetTextBoxSizeOperation | SetElementSizeOperation | ReplaceImageOperation | SetImageFitOperation | SetImagePositionOperation | ResetFieldOperation | ResetImageOperation;

type PatchBase = {
  revision: number;
  projectId: string;
  outputMode: EditOutputMode;
  baseFingerprint: string;
  savedAt: string;
  operations: EditPatchOperation[];
};

export type PresentationEditPatchV1 = PatchBase & {
  schemaVersion: "1.0";
  status: EditPatchStatus;
};
export type PresentationEditPatchV2 = PatchBase & { schemaVersion: "2.0"; status: EditPatchStatus; reviewStatus: EditReviewStatus };
export type PresentationEditPatch = PresentationEditPatchV1 | PresentationEditPatchV2;

export type ResizeContract = {
  mode: "slide" | "report";
  defaultValue?: TextBoxSize;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxMinHeight: number;
  snap?: number;
  protectedSelectors?: string[];
};

type EditableTargetBase = {
  editId: string;
  targetId: string;
  field: string;
  scope: EditScope;
  expectedValueHash: string;
  basisIds?: string[];
  reviewOnChange?: boolean;
  resize?: ResizeContract;
  /** Stable selector only. Positional selectors are rejected by deterministic validation. */
  selector?: string;
};

export type EditableTextDefinition = EditableTargetBase & {
  kind?: "text";
  strategy: EditTextStrategy;
  baseValue: string;
  modelSearchAdequacy?: "sufficient" | "limited" | "preliminary" | "not-applicable";
  plainLanguage?: boolean;
};

export type EditableImageDefinition = EditableTargetBase & {
  kind: "image";
  strategy: EditImageStrategy;
  baseValue: BaseImageValue;
  allowedFits?: ImageFit[];
};

export type EditableFieldDefinition = EditableTextDefinition | EditableImageDefinition;

type RegistryBase = {
  projectId: string;
  outputMode: EditOutputMode;
  baseFingerprint: string;
  evidenceIds?: string[];
  fields: EditableFieldDefinition[];
};
export type EditableRegistryV1 = RegistryBase & { schemaVersion: "1.0" };
export type EditableRegistryV2 = RegistryBase & { schemaVersion: "2.0" };
export type EditableRegistry = EditableRegistryV1 | EditableRegistryV2;

export type EffectiveEditValue = {
  kind: "text" | "image";
  text?: string;
  size?: TextBoxSize;
  image?: BaseImageValue | ManagedImageAsset;
  fit?: ImageFit;
  position?: ImagePosition;
};

export type EditPatchValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  needsEvidenceReview?: boolean;
};

export type EditSaveResult = { kind: "local-project" | "download"; patch: PresentationEditPatch; message: string };
export type EditUploadResult = { kind: "local-project"; asset: ManagedImageAsset; message: string };
