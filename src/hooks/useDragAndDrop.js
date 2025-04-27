import { useState, useCallback } from 'react';

const useDragAndDrop = (initialBlocks) => {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [draggedBlockId, setDraggedBlockId] = useState(null);

  const handleDragStart = useCallback((blockId) => {
    setDraggedBlockId(blockId);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (dropTargetId) => {
      if (!draggedBlockId) return;

      const draggedIndex = blocks.findIndex((block) => block.id === draggedBlockId);
      const dropIndex = blocks.findIndex((block) => block.id === dropTargetId);

      if (draggedIndex === -1 || dropIndex === -1) return;

      const updatedBlocks = [...blocks];
      const [draggedBlock] = updatedBlocks.splice(draggedIndex, 1);
      updatedBlocks.splice(dropIndex, 0, draggedBlock);

      setBlocks(updatedBlocks);
      setDraggedBlockId(null);
    },
    [blocks, draggedBlockId]
  );

  return {
    blocks,
    handleDragStart,
    handleDragOver,
    handleDrop,
    setBlocks,
  };
};

export default useDragAndDrop;