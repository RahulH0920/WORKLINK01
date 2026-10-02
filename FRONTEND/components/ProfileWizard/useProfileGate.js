import { useState } from 'react';

/**
 * useProfileGate — reusable hook that gates any action behind profile completion.
 *
 * Usage:
 *   const { showWizard, pendingAction, requireProfile, onWizardComplete, onWizardClose } = useProfileGate(user);
 *
 *   const handleApply = (job) => {
 *     requireProfile(`apply for "${job.title}"`, () => { ... });
 *   };
 */
export default function useProfileGate(user) {
  const [showWizard, setShowWizard] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const requireProfile = (actionName, callback) => {
    if (user?.profileComplete) {
      callback();
    } else {
      setPendingAction({ name: actionName, callback });
      setShowWizard(true);
    }
  };

  const onWizardComplete = (updatedUser) => {
    setShowWizard(false);
    if (pendingAction?.callback) {
      pendingAction.callback();
    }
    setPendingAction(null);
  };

  const onWizardClose = () => {
    setShowWizard(false);
    setPendingAction(null);
  };

  return { showWizard, pendingAction, requireProfile, onWizardComplete, onWizardClose };
}
