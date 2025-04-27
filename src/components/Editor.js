import React, { useState, useRef, useEffect } from 'react';
import useDragAndDrop from '../hooks/useDragAndDrop';

const initialBlocks = [
  { id: '1', type: 'text', content: 'This is a text block.' },
  { id: '2', type: 'heading', content: 'This is a heading block.' },
  { id: '3', type: 'todo', content: 'This is a to-do block.', completed: false },
];

const Editor = () => {
  const { blocks, handleDragStart, handleDragOver, handleDrop, setBlocks } =
    useDragAndDrop(initialBlocks);

  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [toolbarStates, setToolbarStates] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    code: false,
  });
  const [activeBlockId, setActiveBlockId] = useState(null); // Track the block for which the dropdown is active
  const [activeBlockMenuId, setActiveBlockMenuId] = useState(null); // For the "+" dropdown
  const [activeThreeDotMenuId, setActiveThreeDotMenuId] = useState(null); // For the "three dots" dropdown
  const blockRefs = useRef({}); // Store references to each block
  const editorRef = useRef(null); // Reference to the editor container

  useEffect(() => {
    const handleClickOutside = (event) => {
      const selection = window.getSelection();
      const isTextSelected = selection && !selection.isCollapsed;

      if (
        editorRef.current &&
        !editorRef.current.contains(event.target) &&
        !isTextSelected
      ) {
        setToolbarVisible(false); // Hide the toolbar
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const changeBlockType = (blockId, newType) => {
    setBlocks(
      blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              type: newType,
              content: newType === 'todo' ? 'New to-do item' : block.content,
              completed: newType === 'todo' ? false : undefined,
            }
          : block
      )
    );
  };

  const deleteBlock = (blockId) => {
    setBlocks(blocks.filter((block) => block.id !== blockId));
  };

  const updateBlockContent = (blockId, newContent) => {
    setBlocks(
      blocks.map((block) =>
        block.id === blockId ? { ...block, content: newContent } : block
      )
    );
  };

  const toggleTodoCompletion = (blockId) => {
    setBlocks(
      blocks.map((block) =>
        block.id === blockId ? { ...block, completed: !block.completed } : block
      )
    );
  };

  const handleKeyDown = (e, blockId) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent default behavior of Enter key
      addBlockBelow(blockId); // Add a new block below the current block
    } else if (e.key === 'Backspace') {
      const currentBlock = blocks.find((block) => block.id === blockId);
      if (currentBlock.content === '') {
        e.preventDefault(); // Prevent default backspace behavior
        const index = blocks.findIndex((block) => block.id === blockId);

        if (index > 0) {
          const previousBlock = blocks[index - 1];
          deleteBlock(blockId); // Delete the current block
          setTimeout(() => focusBlock(previousBlock.id), 0); // Focus the previous block
        }
      }
    }
  };

  const addBlockBelow = (blockId) => {
    const currentBlock = blocks.find((block) => block.id === blockId);
    const newBlock = {
      id: Date.now().toString(),
      type: currentBlock.type === 'todo' ? 'todo' : 'text', // Match type if current block is 'todo'
      content: '',
      ...(currentBlock.type === 'todo' && { completed: false }), // Add 'completed' property for 'todo'
    };

    const index = blocks.findIndex((block) => block.id === blockId);
    const updatedBlocks = [
      ...blocks.slice(0, index + 1),
      newBlock,
      ...blocks.slice(index + 1),
    ];
    setBlocks(updatedBlocks);

    // Focus the newly added block
    setTimeout(() => focusBlock(newBlock.id), 0);
  };

  const focusBlock = (blockId) => {
    const blockElement = blockRefs.current[blockId];
    if (blockElement) {
      blockElement.focus();

      // Move the caret to the end of the content
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(blockElement);
      range.collapse(false); // Collapse the range to the end
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const getParentOfSelectedText = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const parentNode = range.commonAncestorContainer;
  
      // If the parentNode is a text node, get its parent element
      return parentNode.nodeType === Node.TEXT_NODE ? parentNode.parentNode : parentNode;
    }
    return null; // No selection or no parent found
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const parent = getParentOfSelectedText();

      if (!selection.isCollapsed) {
        // Show the toolbar near the selected text
        setToolbarPosition({ top: rect.top - 40, left: rect.left });
        setToolbarVisible(true);

        // Update the toolbar button states based on the current formatting
        setToolbarStates({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strikeThrough: document.queryCommandState('strikeThrough'),
          code: parent && parent.tagName === 'CODE', // Custom handling for code
        });
      } else {
        // Hide the toolbar if no text is selected
        setToolbarVisible(false);
      }
    } else {
      // Hide the toolbar if no selection exists
      setToolbarVisible(false);
    }
  };

  const applyFormatting = (command, value = null) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    if (command === 'code') {
      // Custom toggle for <code> formatting
      const parentNode = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentNode
      : range.commonAncestorContainer;

      if (parentNode.tagName === 'CODE') {
      // If already wrapped in <code>, unwrap it while preserving child formatting
      const fragment = document.createDocumentFragment();
      while (parentNode.firstChild) {
        fragment.appendChild(parentNode.firstChild); // Move child nodes to the fragment
      }
      parentNode.replaceWith(fragment); // Replace <code> with its children
      } else {
      // Wrap the selected text in a <code> tag
      const selectedText = range.toString();
      if (selectedText) {
        const codeElement = document.createElement('code');
        codeElement.textContent = selectedText;
        range.deleteContents();
        range.insertNode(codeElement);
      }
      }
    } else {
      // Handle formatting when the parent is <code>
      const parentNode = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentNode
      : range.commonAncestorContainer;

      if (parentNode.tagName === 'CODE') {
      // Wrap <code> along with the selected text in the new formatting
      const wrapper = document.createElement(command === 'bold' ? 'b' :
                          command === 'italic' ? 'i' :
                          command === 'underline' ? 'u' :
                          command === 'strikeThrough' ? 's' : 'span');
      wrapper.appendChild(parentNode.cloneNode(true)); // Clone the <code> element
      parentNode.replaceWith(wrapper); // Replace <code> with the new wrapper
      } else {
        // Use execCommand for standard formatting (bold, italic, etc.)
        document.execCommand(command, false, value);
      }
    }

    // Update the toolbar states after applying formatting
    const parent = getParentOfSelectedText();
    setToolbarStates({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      code: parent && parent.tagName === 'CODE',
    });
  };

  const toggleBlockTypeMenu = (blockId) => {
    setActiveBlockMenuId((prev) => (prev === blockId ? null : blockId)); // Toggle "+" dropdown
    setActiveThreeDotMenuId(null); // Close "three dots" dropdown
  };

  const toggleThreeDotMenu = (blockId) => {
    setActiveThreeDotMenuId((prev) => (prev === blockId ? null : blockId)); // Toggle "three dots" dropdown
    setActiveBlockMenuId(null); // Close "+" dropdown
  };

  const handleBlockTypeChange = (blockId, newType) => {
    changeBlockType(blockId, newType);
    setActiveBlockMenuId(null); // Close the dropdown after selection
  };

  return (
    <div
      ref={editorRef} // Attach the ref to the editor container
      className="editor"
      onMouseUp={handleTextSelection}
      onKeyUp={handleTextSelection} // Update toolbar on keyboard selection changes
    >
      {blocks.map((block) => (
        <div
          key={block.id}
          draggable
          onDragStart={() => handleDragStart(block.id)}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(block.id)}
          className="block"
          onMouseLeave={() => {
            setActiveBlockMenuId(null);
            setActiveThreeDotMenuId(null);
          }} // Collapse both dropdowns on mouse leave
          onClick={(e) => focusBlock(e, block.id)} // Handle block click
        >
          <div className="block-controls">
            {/* Six-dot button for dropdown */}
            <button
              className="six-dot-btn"
              onClick={() => toggleThreeDotMenu(block.id)}
            >
              <i className="fas fa-grip-vertical"></i> {/* Six dots icon */}
            </button>
            {activeThreeDotMenuId === block.id && (
              <div className="block-menu">
                <button onClick={() => deleteBlock(block.id)}>
                  <i className="fas fa-trash-alt"></i> Delete Block
                </button>
              </div>
            )}
            {/* "+" button for dropdown */}
            <button
              className="add-block-btn"
              onClick={() => toggleBlockTypeMenu(block.id)}
            >
              <i className="fas fa-plus"></i> {/* Plus icon */}
            </button>
            {activeBlockMenuId === block.id && (
              <div className="block-menu">
                <button onClick={() => handleBlockTypeChange(block.id, 'text')}>
                  <i className="fas fa-t"></i> Text
                </button>
                <button onClick={() => handleBlockTypeChange(block.id, 'heading')}>
                  <i className="fas fa-heading"></i> Heading
                </button>
                <button onClick={() => handleBlockTypeChange(block.id, 'todo')}>
                  <i className="fas fa-check-square"></i> To-Do
                </button>
              </div>
            )}
          </div>
          {/* Render block content */}
          {block.type === 'heading' && (
            <h2
              ref={(el) => (blockRefs.current[block.id] = el)}
              contentEditable
              suppressContentEditableWarning
              onKeyDown={(e) => handleKeyDown(e, block.id)}
              onBlur={(e) => updateBlockContent(block.id, e.target.innerText)}
              style={{ width: '100%' }}
            >
              {block.content}
            </h2>
          )}
          {block.type === 'text' && (
            <p
              ref={(el) => (blockRefs.current[block.id] = el)}
              contentEditable
              suppressContentEditableWarning
              onKeyDown={(e) => handleKeyDown(e, block.id)}
              onBlur={(e) => updateBlockContent(block.id, e.target.innerText)}
              style={{ width: '100%' }}
            >
              {block.content}
            </p>
          )}
          {block.type === 'todo' && (
            <div className="todo-block">
              <input
                type="checkbox"
                checked={block.completed}
                onChange={() => toggleTodoCompletion(block.id)}
              />
              <span
                ref={(el) => (blockRefs.current[block.id] = el)}
                contentEditable
                suppressContentEditableWarning
                onKeyDown={(e) => handleKeyDown(e, block.id)}
                onBlur={(e) => updateBlockContent(block.id, e.target.innerText)}
                style={{
                  textDecoration: block.completed ? 'line-through' : 'none',
                  width: '100%',
                }}
              >
                {block.content}
              </span>
            </div>
          )}
        </div>
      ))}
      {/* Text Formatting Toolbar */}
      {toolbarVisible && (
        <div
          className="text-toolbar"
          style={{
            position: 'absolute',
            top: `${toolbarPosition.top}px`,
            left: `${toolbarPosition.left}px`,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '5px',
            display: 'flex',
            gap: '5px',
            zIndex: 1000,
          }}
        >
          <button
            onClick={() => applyFormatting('bold')}
            style={{ fontWeight: 'bold' }}
            className={toolbarStates.bold ? 'active' : ''}
          >
            B
          </button>
          <button
            onClick={() => applyFormatting('italic')}
            style={{ fontStyle: 'italic' }}
            className={toolbarStates.italic ? 'active' : ''}
          >
            I
          </button>
          <button
            onClick={() => applyFormatting('underline')}
            style={{ textDecoration: 'underline' }}
            className={toolbarStates.underline ? 'active' : ''}
          >
            U
          </button>
          <button
            onClick={() => applyFormatting('strikeThrough')}
            style={{ textDecoration: 'line-through' }}
            className={toolbarStates.strikeThrough ? 'active' : ''}
          >
            S
          </button>
          <button
            onClick={() => applyFormatting('code')}
            style={{ fontFamily: 'monospace' }}
            className={toolbarStates.code ? 'active' : ''}
          >
            &lt;/&gt;
          </button>
        </div>
      )}
    </div>
  );
};

export default Editor;