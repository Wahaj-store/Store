'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

type StepTarget = string | (() => void);

type CheckoutProgressProps = {
  currentStep: number;
  completedSteps?: readonly number[];
  stepTargets?: Partial<Record<number, StepTarget>>;
};

const steps = [
  { number: 1, title: 'السلة', detail: 'مراجعة اختياراتكِ' },
  { number: 2, title: 'الشحن والدفع', detail: 'العنوان وطريقة الدفع' },
  { number: 3, title: 'تأكيد الطلب', detail: 'تم استلام الطلب' },
] as const;

export default function CheckoutProgress({
  currentStep,
  completedSteps = [],
  stepTargets = {},
}: CheckoutProgressProps) {
  const activeStep = steps[Math.min(Math.max(currentStep, 1), steps.length) - 1];

  return (
    <nav className="wahaj-checkout-progress wahaj-checkout-progress--unified" aria-label="مراحل إتمام الطلب">
      <p className="wahaj-checkout-progress__status" role="status" aria-live="polite">
        <span>الخطوة</span>{' '}
        <strong className="wahaj-checkout-progress__status-number">{activeStep.number}</strong>
        {' '}<span>من {steps.length}</span>{' '}
        <i aria-hidden="true">·</i>{' '}
        <b>{activeStep.title}</b>
      </p>

      <div className="wahaj-checkout-progress__steps" role="list">
        {steps.map((step, index) => {
          const isCurrent = step.number === activeStep.number;
          const isComplete = completedSteps.includes(step.number);
          const target = stepTargets[step.number];
          const state = isCurrent ? 'is-current' : isComplete ? 'is-complete' : 'is-upcoming';
          const content = (
            <>
              <span className="wahaj-checkout-progress__number">
                {isComplete ? <Check size={15} strokeWidth={2.5} aria-hidden="true" /> : String(step.number).padStart(2, '0')}
              </span>
              <span className="wahaj-checkout-progress__copy">
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </span>
            </>
          );
          const currentProps = isCurrent ? { 'aria-current': 'step' as const } : {};

          return (
            <Fragment key={step.number}>
              <div className={`wahaj-checkout-progress__step ${state}`} role="listitem">
                {typeof target === 'string' ? (
                  <Link className="wahaj-checkout-progress__control" href={target} {...currentProps}>{content}</Link>
                ) : typeof target === 'function' ? (
                  <button className="wahaj-checkout-progress__control" type="button" onClick={target} {...currentProps}>{content}</button>
                ) : (
                  <span className="wahaj-checkout-progress__control" {...currentProps}>{content}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <span
                  className={`wahaj-checkout-progress__connector ${completedSteps.includes(step.number) ? 'is-complete' : ''}`}
                  aria-hidden="true"
                ><span /></span>
              )}
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
}
