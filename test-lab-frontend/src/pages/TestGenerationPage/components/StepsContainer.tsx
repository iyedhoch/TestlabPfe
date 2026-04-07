import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import TestStep from "./TestStep";
import { useEffect, useState } from "react";
import {
  ITestCase,
  ITestStep,
  ITestSuite,
  useReorderTestStepsMutation,
} from "@/services";
import { useToast } from "@chakra-ui/react";

interface IStepsContainer {
  testSuites: ITestSuite[];
  selectedTestCase: ITestCase;
}

export default function StepsContainer({ selectedTestCase }: IStepsContainer) {
  const [testSteps, setTestSteps] = useState<ITestStep[]>([]);
  const toast = useToast();
  const { mutate: reorderTestSteps } = useReorderTestStepsMutation();

  // Update testSteps when selectedTestCase changes
  useEffect(() => {
    if (selectedTestCase?.testSteps) {
      // Sort by order before setting state
      const sortedSteps = [...selectedTestCase.testSteps].sort(
        (a, b) => a.order - b.order
      );
      setTestSteps(sortedSteps);
    } else {
      setTestSteps([]);
    }
  }, [selectedTestCase]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active?.id !== over?.id) {
      setTestSteps((items) => {
        const oldIndex = items?.findIndex((item) => item.id === active.id);
        const newIndex = items?.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // Update the order property for each step
        const reorderedItems = newItems?.map((item, index) => ({
          ...item,
          order: index + 1,
        }));

        // Save the new order to backend
        const steps = reorderedItems.map((step) => ({
          id: step?.id,
          order: step?.order,
        }));

        reorderTestSteps(
          {
            testCaseId: selectedTestCase?.id,
            steps,
          },
          {
            onSuccess: () => {
              // toast({
              //   title: "Ordre sauvegardé",
              //   description: "L'ordre des étapes a été mis à jour avec succès",
              //   status: "success",
              //   duration: 2000,
              // });
            },
            onError: (error: any) => {
              // Revert the order on error
              const sortedSteps = [...selectedTestCase.testSteps].sort(
                (a, b) => a.order - b.order
              );
              setTestSteps(sortedSteps);

              toast({
                title: "Erreur de sauvegarde",
                description:
                  error?.response?.data?.error ||
                  error?.message ||
                  "Impossible de sauvegarder l'ordre des étapes",
                status: "error",
                duration: 4000,
              });
            },
          }
        );

        return reorderedItems;
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={testSteps?.map((step) => step?.id)}
        strategy={verticalListSortingStrategy}
      >
        {testSteps?.map((step) => (
          <TestStep
            key={`${step?.id}-${step?.expectedResult}-${step?.action}`}
            {...step}
            testCaseId={selectedTestCase?.id as string}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
