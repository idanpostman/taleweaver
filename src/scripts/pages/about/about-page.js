class AboutPage {
  async render() {
    const jek = '/images/jek.jpg';

    return `
      <div class="page-content-wrapper about-page-container">
        <div class="about-content">
          <div class="about-text">
            <h1>About TaleWeaver</h1>
            <p>
              Welcome to TaleWeaver, a place where stories come to life! 
              TaleWeaver is a community-driven platform designed for sharing and discovering captivating narratives 
              from around the globe. Whether it's a personal anecdote, a fictional short story, a travel journal, 
              or a poetic reflection, every voice has a place here.
            </p>
            <p>
              Our mission is to connect people through the power of storytelling. We believe that sharing our 
              experiences and imaginations can foster understanding, empathy, and inspiration. 
              With TaleWeaver, you can easily publish your tales, complete with images and locations, 
              and explore a diverse tapestry of stories woven by others.
            </p>
            <p>
              Join us in weaving a richer, more connected world, one story at a time.
            </p>
          </div>
          <div class="about-image">
            <img src="${jek}" alt="Inspiration for TaleWeaver - My Cat">
            <p class="cat-caption">Our beloved mascot and source of endless inspiration!</p>
          </div>
        </div>
      </div>
    `;
  }
}

export default AboutPage;
