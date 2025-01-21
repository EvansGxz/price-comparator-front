import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #fdfbfb, #ebedee);
`;

const ChatContainer = styled.div`
  background-color: #ffffff;
  width: 400px;
  max-height: 600px;
  border-radius: 16px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 16px;
`;

const Message = styled.div`
  background-color: ${(props) => (props.isUser ? '#cce5ff' : '#f1f1f1')};
  color: #333;
  padding: 10px 14px;
  border-radius: 12px;
  margin: 6px 0;
  align-self: ${(props) => (props.isUser ? 'flex-end' : 'flex-start')};
`;

const InputContainer = styled.div`
  display: flex;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #ddd;
`;

const InputField = styled.input`
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  margin-right: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  outline: none;
`;

const SendButton = styled.button`
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s;

  &:hover {
    background-color: #0056b3;
  }
`;

const ProductName = styled.div`
  font-weight: bold;
  font-size: 16px;`
;

const ProductPrice = styled.div`
  font-size: 14px;
  color: #555;
  margin-top: 4px;`
;

const ProductLink = styled.a`
  font-size: 14px;
  color: #007bff;
  text-decoration: none;
  margin-top: 6px;
  display: inline-block;

  &:hover {
    text-decoration: underline;
  }`
;

const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [flowState, setFlowState] = useState(() => {
    const savedState = localStorage.getItem('flowState');
    return savedState ? JSON.parse(savedState) : { step: 0, type: null, model: null };
  });

  const flowQuestions = [
    '¿Qué tipo de producto estás buscando? (por ejemplo, laptop, teléfono, tableta)',
    '¿Tienes un modelo específico en mente? (Si no, responde "no")',
  ];

  const parseResponse = (step, response) => {
    if (response.toLowerCase() === 'none' || response.toLowerCase() === 'no') return null;

    switch (step) {
      case 0: // Type
        return response.toLowerCase();
      case 1: // Model
        return response;
      default:
        return null;
    }
  };

  const handleSendMessage = async () => {
    if (!input) return;

    const userMessage = { text: input, isUser: true };
    setMessages((prev) => [...prev, userMessage]);

    const currentStep = flowState.step;
    const parsedValue = parseResponse(currentStep, input);

    const updatedFlowState = {
      ...flowState,
      [currentStep === 0 ? 'type' : currentStep === 1 && 'model']: parsedValue,
      step: currentStep + 1,
    };

    setFlowState(updatedFlowState);
    localStorage.setItem('flowState', JSON.stringify(updatedFlowState));

    if (updatedFlowState.step < flowQuestions.length) {
      const nextQuestion = flowQuestions[updatedFlowState.step];
      setMessages((prev) => [...prev, { text: nextQuestion, isUser: false }]);
    } else {
      const query = [updatedFlowState.type, updatedFlowState.model]
        .filter(Boolean)
        .join(' ');

      setMessages((prev) => [
        ...prev,
        { text: 'Searching for products...', isUser: false },
      ]);

      const results = await fetchData(query);
      
      sendProductsSequentially(results);
 // Clear flow state and reset step to 0
 setFlowState({ step: 0, type: null, model: null });
 localStorage.removeItem('flowState');
    }

    setInput('');
  };

  const fetchData = async (query) => {
    try {
      console.log(query);
      
      const response = await fetch('http://localhost:3000/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeName: 'soriana', query }),
      });
      return await response.json();
      
    } catch (error) {
      return [{ name: 'Error', price: 'N/A', link: '' }];
    }
  };

  const sendProductsSequentially = (products) => {
    if (products.length === 0) {
      setMessages((prev) => [
        ...prev,
        { text: 'No products found for your query.', isUser: false },
      ]);
      localStorage.removeItem('flowState');
      return;
    }
  
    const formatPrice = (price) => {
      // Ensure price is a number and format as currency
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice)) return 'N/A';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(parsedPrice);
    };
  
    const sendProductMessage = (index) => {
      if (index >= products.length) return;
  
      const product = products[index];
      const formattedPrice = formatPrice(product.price);
  
      const botMessage = {
        text: (
          <>
            <ProductName>{product.name}</ProductName>
            <ProductPrice>Price: {formattedPrice}</ProductPrice>
            <ProductLink href={product.link} target="_blank">
              [Link to product]
            </ProductLink>
          </>
        ),
        isUser: false,
      };
  
      setTimeout(() => {
        setMessages((prev) => [...prev, botMessage]);
        sendProductMessage(index + 1);
      }, 1500); // Delay between messages
    };
  
    sendProductMessage(0);
  };

  useEffect(() => {
    if (flowState.step < flowQuestions.length) {
      setMessages([{ text: flowQuestions[flowState.step], isUser: false }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowState.step]);

  return (
    <AppContainer>
      <h2>Comparador de precios</h2>
      <ChatContainer>
        {messages.map((message, idx) => (
          <Message key={idx} isUser={message.isUser}>
            {message.text}
          </Message>
        ))}
        <InputContainer>
          <InputField
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <SendButton onClick={handleSendMessage}>Send</SendButton>
        </InputContainer>
      </ChatContainer>
    </AppContainer>
  );
};

export default App;
