import { stage2FittingReferences } from '../catalogue/stage2-fittings';
import { Section } from './components';
export function FittingReferences() {
  return <Section title="Fitting references" aside={<span className="unit-badge">NOT APPLIED</span>}>
    <p className="field-note">Your six supplied products are recorded below. The cabinet still uses its pinned concept geometry. These references do not select a complete assembly, change dimensions or establish load capacity.</p>
    <details className="advanced-material"><summary>Review supplied products</summary>{stage2FittingReferences.map(part => <div key={part.id} className="fitting-reference"><strong>{part.role}</strong><p>{part.manufacturer} · {part.article}</p><a href={part.supplierUrl} target="_blank" rel="noreferrer">Supplier reference</a><p className="field-note">{part.limits}</p><details><summary>Verification remaining</summary><p className="field-note">{part.outstanding}</p></details></div>)}</details>
  </Section>;
}
