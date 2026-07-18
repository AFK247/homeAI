/*
 * Form-builder barrel (ported from the reference proa-erp form convention).
 *
 * Usage:
 *   <FormFactory schema={CreateXSchema} defaultValues={...} onSubmit={...}>
 *     <FieldFactory fields={[{ name: "title", label: "Title", type: "text", isRequired: true }]} />
 *   </FormFactory>
 */
export { type FieldConfig, FieldFactory } from "./field-factory";
export { FormFactory } from "./form-factory";
