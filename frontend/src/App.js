import React, { useState } from 'react';
import axios from 'axios';
import Dropzone from 'react-dropzone';
import './App.css';

const API_URL = '/api';

function App() {
  const [activeTab, setActiveTab] = useState('text2img'); // Mặc định hiển thị "Tạo ảnh từ văn bản"
  const [textPrompt, setTextPrompt] = useState('');
  const [sizeChoice, setSizeChoice] = useState('1024x768');
  const [customSize, setCustomSize] = useState('');
  const [productCodes, setProductCodes] = useState([]);
  const [imageFile, setImageFile] = useState(null); // File ảnh upload
  const [previewImage, setPreviewImage] = useState(null); // URL preview của ảnh upload
  const [position, setPosition] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const productOptions = [
    "C1012 Glacier White", "C1026 Polar", "C3269 Ash Grey",
    "C3168 Silver Wave", "C1005 Milky White", "C2103 Onyx Carrara",
    "C2104 Massa", "C3105 Casla Cloudy", "C3146 Casla Nova",
    "C2240 Marquin", "C2262 Concrete (Honed)", "C3311 Calacatta Sky",
    "C3346 Massimo", "C4143 Mario", "C4145 Marina",
    "C4202 Calacatta Gold", "C1205 Casla Everest", "C4211 Calacatta Supreme",
    "C4204 Calacatta Classic", "C1102 Super White", "C4246 Casla Mystery",
    "C4345 Oro", "C4346 Luxe", "C4342 Casla Eternal",
    "C4221 Athena", "C4255 Calacatta Extra"
  ];

  const toggleProduct = (product) => {
    if (activeTab === 'text2img') {
      if (productCodes.includes(product)) {
        setProductCodes(productCodes.filter(code => code !== product));
      } else {
        setProductCodes([...productCodes, product]);
      }
    } else {
      setProductCodes([product]); // Chỉ cho phép chọn 1 sản phẩm cho img2img
    }
  };

  const handleText2Img = async (e) => {
    e.preventDefault();
    if (!textPrompt || productCodes.length === 0) {
      alert('Vui lòng nhập mô tả và chọn ít nhất một sản phẩm.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/text2img`,
        {
          prompt: textPrompt,
          size_choice: sizeChoice,
          custom_size: sizeChoice === 'Custom size' ? customSize : null,
          product_codes: productCodes
        },
        {
          headers: { 'Authorization': 'Bearer YOUR_API_KEY_HERE' }, // Thay bằng API key thực tế
          responseType: 'blob'
        }
      );
      const imageUrl = URL.createObjectURL(response.data);
      setGeneratedImage(imageUrl);
    } catch (error) {
      alert('Lỗi khi tạo ảnh: ' + (error.response?.data?.detail || error.message));
    }
    setLoading(false);
  };

  const handleImg2Img = async (e) => {
    e.preventDefault();
    if (!imageFile || !position || productCodes.length === 0) {
      alert('Vui lòng tải ảnh lên, nhập vị trí và chọn một sản phẩm.');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('position', position);
    formData.append('size_choice', sizeChoice);
    formData.append('custom_size', sizeChoice === 'Custom size' ? customSize : null);
    formData.append('product_codes', JSON.stringify(productCodes));
    try {
      const response = await axios.post(
        `${API_URL}/img2img`,
        formData,
        {
          headers: {
            'Authorization': 'Bearer YOUR_API_KEY_HERE', // Thay bằng API key thực tế
            'Content-Type': 'multipart/form-data'
          },
          responseType: 'blob'
        }
      );
      const imageUrl = URL.createObjectURL(response.data);
      setGeneratedImage(imageUrl);
    } catch (error) {
      alert('Lỗi khi xử lý ảnh: ' + (error.response?.data?.detail || error.message));
    }
    setLoading(false);
  };

  const LoadingSpinner = () => (
    <div className="loading-spinner"></div>
  );

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    setImageFile(file);
    setPreviewImage(URL.createObjectURL(file)); // Hiển thị preview ngay lập tức
  };

  return (
    <div className="App">
      <header className="header">
        <div className="logo-container">
          <img src="/static/images/logo.png" alt="Casla Quartz Logo" className="logo-img" />
          <h1>Đưa CaslaQuartz vào công trình của bạn</h1>
        </div>
      </header>

      {/* Tabs để chọn giữa Text2Img và Img2Img */}
      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'text2img' ? 'active' : ''}`}
          onClick={() => setActiveTab('text2img')}
        >
          Tạo ảnh từ văn bản
        </button>
        <button
          className={`tab-button ${activeTab === 'img2img' ? 'active' : ''}`}
          onClick={() => setActiveTab('img2img')}
        >
          Chuyển đổi ảnh
        </button>
      </div>

      {/* Hiển thị form tương ứng với tab được chọn */}
      {activeTab === 'text2img' && (
        <div className="section">
          <h2>Tạo ảnh từ văn bản</h2>
          <form onSubmit={handleText2Img}>
            <div>
              <label>Mô tả (Prompt):</label>
              <input
                type="text"
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                placeholder="Ví dụ: Bàn bếp hiện đại"
                required
              />
            </div>

            <div>
              <label>Kích thước:</label>
              <select
                value={sizeChoice}
                onChange={(e) => setSizeChoice(e.target.value)}
              >
                <option value="1024x768">1024x768</option>
                <option value="Custom size">Tùy chỉnh</option>
              </select>
              {sizeChoice === 'Custom size' && (
                <input
                  type="text"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  placeholder="Ví dụ: 1280x720"
                />
              )}
            </div>

            <div>
              <label>Chọn sản phẩm:</label>
              <div className="product-buttons">
                {productOptions.map(product => (
                  <button
                    key={product}
                    type="button"
                    className={`product-button ${productCodes.includes(product) ? 'selected' : ''}`}
                    onClick={() => toggleProduct(product)}
                  >
                    {product}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? <LoadingSpinner /> : 'Tạo ảnh'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'img2img' && (
        <div className="section">
          <h2>Chuyển đổi ảnh</h2>
          <form onSubmit={handleImg2Img}>
            <Dropzone onDrop={onDrop}>
              {({ getRootProps, getInputProps }) => (
                <section>
                  <div {...getRootProps()} className="dropzone">
                    <input {...getInputProps()} />
                    <p>{imageFile ? imageFile.name : 'Kéo thả ảnh vào đây hoặc nhấp để chọn ảnh'}</p>
                    {previewImage && (
                      <img src={previewImage} alt="Preview" className="preview-image" />
                    )}
                  </div>
                </section>
              )}
            </Dropzone>

            <div>
              <label>Vị trí áp dụng texture:</label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Ví dụ: countertop"
                required
              />
            </div>

            <div>
              <label>Chọn sản phẩm:</label>
              <div className="product-buttons">
                {productOptions.map(product => (
                  <button
                    key={product}
                    type="button"
                    className={`product-button ${productCodes.includes(product) ? 'selected' : ''}`}
                    onClick={() => setProductCodes([product])}
                  >
                    {product}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? <LoadingSpinner /> : 'Xử lý ảnh'}
            </button>
          </form>
        </div>
      )}

      {/* Display Generated Image */}
      {generatedImage && (
        <div className="section">
          <h2>Kết quả:</h2>
          <img src={generatedImage} alt="Generated" className="generated-image" />
          <a href={generatedImage} download="generated_image.png">Tải ảnh xuống</a>
        </div>
      )}
    </div>
  );
}

export default App;