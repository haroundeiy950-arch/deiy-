from fastapi import FastAPI, Request, Depends, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import or_
from itsdangerous import URLSafeSerializer, BadSignature
from pathlib import Path
import os

from database import Base, engine, get_db
from models import User, Product, CartItem, Favorite, Order, OrderItem
from auth import hash_password, verify_password
from ai_service import ask_ai

Base.metadata.create_all(bind=engine)

app = FastAPI(title="HarounDeiy AI Marketplace")

BASE_DIR = Path(__file__).resolve().parent

app.mount(
    "/static",
    StaticFiles(directory=str(BASE_DIR / "static")),
    name="static"
)

templates = Jinja2Templates(
    directory=str(BASE_DIR / "templates")
)

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "change-this-secret-key"
)

serializer = URLSafeSerializer(
    SECRET_KEY,
    salt="haroundeiy-session"
)


def seed_products(db: Session):

    if db.query(Product).count() > 0:
        return

    products = [

        Product(
            name="iPhone 15 Pro Max",
            subtitle="256GB Titanium smartphone with advanced camera",
            category="Phones",
            price=1199.00,
            old_price=1299.00,
            stock=12,
            rating=4.9,
            image_url="https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=900&q=80",
            tags="iphone,apple,phone,camera,premium"
        ),

        Product(
            name="Samsung Galaxy S25 Ultra",
            subtitle="Premium Android phone with powerful camera",
            category="Phones",
            price=1099.00,
            old_price=1299.00,
            stock=15,
            rating=4.8,
            image_url="https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=80",
            tags="samsung,galaxy,phone,android,camera"
        ),

        Product(
            name="Google Pixel 10 Pro",
            subtitle="AI-powered camera and clean Android experience",
            category="Phones",
            price=999.00,
            old_price=1099.00,
            stock=10,
            rating=4.7,
            image_url="https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80",
            tags="google,pixel,phone,camera,ai"
        ),

        Product(
            name="MacBook Air M2",
            subtitle="13-inch lightweight laptop with Apple M2 chip",
            category="Laptops",
            price=899.00,
            old_price=999.00,
            stock=8,
            rating=4.8,
            image_url="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
            tags="macbook,apple,laptop,m2"
        ),

        Product(
            name="MacBook Pro M5",
            subtitle="Professional laptop for demanding work",
            category="Laptops",
            price=1999.00,
            old_price=2199.00,
            stock=5,
            rating=4.9,
            image_url="https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=900&q=80",
            tags="macbook,apple,laptop,m5,pro"
        ),

        Product(
            name="Dell XPS 15",
            subtitle="Powerful Windows laptop with premium display",
            category="Laptops",
            price=1499.00,
            old_price=1599.00,
            stock=7,
            rating=4.6,
            image_url="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
            tags="dell,xps,laptop,windows"
        ),

        Product(
            name="Samsung 55-inch 4K Smart TV",
            subtitle="4K HDR smart television",
            category="Screens",
            price=699.00,
            old_price=799.00,
            stock=11,
            rating=4.6,
            image_url="https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=80",
            tags="samsung,tv,screen,4k,smart"
        ),

        Product(
            name="LG 65-inch OLED 4K",
            subtitle="Premium OLED television with deep blacks",
            category="Screens",
            price=1299.00,
            old_price=1499.00,
            stock=4,
            rating=4.9,
            image_url="https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=900&q=80",
            tags="lg,tv,screen,4k,oled"
        ),

        Product(
            name="Sony WH-1000XM6",
            subtitle="Wireless noise-cancelling headphones",
            category="Audio",
            price=399.00,
            old_price=449.00,
            stock=14,
            rating=4.8,
            image_url="https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80",
            tags="sony,headphones,audio,wireless,noise cancelling"
        ),

        Product(
            name="Apple Watch Ultra",
            subtitle="Rugged premium smartwatch",
            category="Watches",
            price=799.00,
            old_price=899.00,
            stock=9,
            rating=4.7,
            image_url="https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=80",
            tags="apple,watch,smartwatch,wearable"
        ),

        Product(
            name="Nike Air Max 270",
            subtitle="Comfortable everyday running-inspired sneakers",
            category="Shoes",
            price=85.99,
            old_price=120.00,
            stock=20,
            rating=4.5,
            image_url="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
            tags="nike,shoes,sneakers,sports"
        ),

        Product(
            name="Men's Premium Shirt",
            subtitle="Modern regular-fit premium cotton shirt",
            category="Clothing",
            price=15.05,
            old_price=25.00,
            stock=30,
            rating=4.4,
            image_url="https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80",
            tags="shirt,men,clothing,cotton"
        ),
    ]

    db.add_all(products)
    db.commit()


@app.on_event("startup")
def startup():

    db = next(get_db())

    try:
        seed_products(db)
    finally:
        db.close()


def current_user(request: Request, db: Session):

    token = request.cookies.get("session")

    if not token:
        return None

    try:

        data = serializer.loads(token)

        return db.query(User).filter(
            User.id == int(data["user_id"])
        ).first()

    except (
        BadSignature,
        KeyError,
        ValueError,
        TypeError
    ):
        return None


def set_session(response, user: User):

    response.set_cookie(
        "session",
        serializer.dumps({"user_id": user.id}),
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 7
    )


def product_dict(product: Product):

    return {
        "id": product.id,
        "name": product.name,
        "subtitle": product.subtitle,
        "category": product.category,
        "price": float(product.price),
        "old_price": (
            float(product.old_price)
            if product.old_price
            else None
        ),
        "stock": product.stock,
        "rating": float(product.rating or 0),
        "image_url": product.image_url,
        "tags": product.tags or ""
    }


@app.get("/", response_class=HTMLResponse)
def home(
    request: Request,
    db: Session = Depends(get_db)
):

    user = current_user(request, db)

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "user": user,
            "products": [
                product_dict(p)
                for p in db.query(Product)
                .order_by(Product.id)
                .all()
            ],
            "categories": [
                x[0]
                for x in db.query(Product.category)
                .distinct()
                .order_by(Product.category)
                .all()
            ]
        }
    )


@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request):

    return templates.TemplateResponse(
        "login.html",
        {"request": request}
    )


@app.get("/register", response_class=HTMLResponse)
def register_page(request: Request):

    return templates.TemplateResponse(
        "register.html",
        {"request": request}
    )


@app.post("/api/register")
def register(
    email: str = Form(...),
    password: str = Form(...),
    name: str = Form(""),
    db: Session = Depends(get_db)
):

    email = email.strip().lower()

    if len(password) < 6:
        raise HTTPException(
            400,
            "Password must contain at least 6 characters."
        )

    if db.query(User).filter(
        User.email == email
    ).first():

        raise HTTPException(
            409,
            "Email is already registered."
        )

    user = User(
        name=name.strip() or email.split("@")[0],
        email=email,
        password_hash=hash_password(password)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    response = RedirectResponse(
        "/",
        status_code=303
    )

    set_session(response, user)

    return response


@app.post("/api/login")
def login(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.email == email.strip().lower()
    ).first()

    if not user or not verify_password(
        password,
        user.password_hash
    ):

        raise HTTPException(
            401,
            "Invalid email or password."
        )

    response = RedirectResponse(
        "/",
        status_code=303
    )

    set_session(response, user)

    return response


@app.post("/api/logout")
def logout():

    response = RedirectResponse(
        "/",
        status_code=303
    )

    response.delete_cookie("session")

    return response


@app.get("/api/products")
def api_products(
    q: str = "",
    category: str = "",
    min_price: float = 0,
    max_price: float = 10**9,
    db: Session = Depends(get_db)
):

    query = db.query(Product).filter(
        Product.price >= min_price,
        Product.price <= max_price,
        Product.stock > 0
    )

    if category and category.lower() != "all":

        query = query.filter(
            Product.category.ilike(category)
        )

    if q.strip():

        term = f"%{q.strip()}%"

        query = query.filter(
            or_(
                Product.name.ilike(term),
                Product.subtitle.ilike(term),
                Product.tags.ilike(term),
                Product.category.ilike(term)
            )
        )

    return [
        product_dict(p)
        for p in query
        .order_by(Product.rating.desc())
        .all()
    ]


@app.get("/api/product/{product_id}")
def api_product(
    product_id: int,
    db: Session = Depends(get_db)
):

    product = db.query(Product).filter(
        Product.id == product_id
    ).first()

    if not product:
        raise HTTPException(
            404,
            "Product not found."
        )

    return product_dict(product)


@app.post("/api/cart/add")
def add_cart(
    product_id: int = Form(...),
    quantity: int = Form(1),
    request: Request = None,
    db: Session = Depends(get_db)
):

    user = current_user(request, db)

    if not user:
        raise HTTPException(
            401,
            "Please log in first."
        )

    product = db.query(Product).filter(
        Product.id == product_id
    ).first()

    if not product:
        raise HTTPException(
            404,
            "Product not found."
        )

    if quantity < 1 or quantity > product.stock:
        raise HTTPException(
            400,
            "Invalid quantity."
        )

    item = db.query(CartItem).filter(
        CartItem.user_id == user.id,
        CartItem.product_id == product_id
    ).first()

    if item:

        item.quantity = min(
            item.quantity + quantity,
            product.stock
        )

    else:

        db.add(
            CartItem(
                user_id=user.id,
                product_id=product_id,
                quantity=quantity
            )
        )

    db.commit()

    return {"ok": True}


@app.get("/api/cart")
def get_cart(
    request: Request,
    db: Session = Depends(get_db)
):

    user = current_user(request, db)

    if not user:

        return {
            "authenticated": False,
            "items": [],
            "total": 0
        }

    items = db.query(CartItem).filter(
        CartItem.user_id == user.id
    ).all()

    result = []
    total = 0

    for item in items:

        if not item.product:
            continue

        subtotal = (
            float(item.product.price)
            * item.quantity
        )

        total += subtotal

        result.append(
            {
                "id": item.id,
                "quantity": item.quantity,
                "subtotal": subtotal,
                "product": product_dict(item.product)
            }
        )

    return {
        "authenticated": True,
        "items": result,
        "total": total
    }


@app.delete("/api/cart/{item_id}")
def delete_cart(
    item_id: int,
    request: Request,
    db: Session = Depends(get_db)
):

    user = current_user(request, db)

    if not user:
        raise HTTPException(
            401,
            "Please log in first."
        )

    item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.user_id == user.id
    ).first()

    if item:

        db.delete(item)
        db.commit()

    return {"ok": True}


@app.post("/api/favorites/{product_id}")
def favorite(
    product_id: int,
    request: Request,
    db: Session = Depends(get_db)
):

    user = current_user(request, db)

    if not user:
        raise HTTPException(
            401,
            "Please log in first."
        )

    product = db.query(Product).filter(
        Product.id == product_id
    ).first()

    if not product:
        raise HTTPException(
            404,
            "Product not found."
        )

    existing = db.query(Favorite).filter(
        Favorite.user_id == user.id,
        Favorite.product_id == product_id
    ).first()

    if existing:

        db.delete(existing)
        liked = False

    else:

        db.add(
            Favorite(
                user_id=user.id,
                product_id=product_id
            )
        )

        liked = True

    db.commit()

    return {"liked": liked}


@app.get("/api/favorites")
def favorites(
    request: Request,
    db: Session = Depends(get_db)
):

    user = current_user(request, db)

    if not user:

        return {
            "authenticated": False,
            "items": []
        }

    rows = db.query(Favorite).filter(
        Favorite.user_id == user.id
    ).all()

    return {
        "authenticated": True,
        "items": [
            product_dict(x.product)
            for x in rows
            if x.product
        ]
    }


@app.post("/api/checkout")
def checkout(
    request: Request,
    db: Session = Depends(get_db)
):

    user = current_user(request, db)

    if not user:
        raise HTTPException(
            401,
            "Please log in first."
        )

    items = db.query(CartItem).filter(
        CartItem.user_id == user.id
    ).all()

    if not items:
        raise HTTPException(
            400,
            "Your cart is empty."
        )

    total = 0

    for item in items:

        if (
            not item.product
            or item.quantity > item.product.stock
        ):

            raise HTTPException(
                400,
                f"Insufficient stock for "
                f"{item.product.name if item.product else 'a product'}."
            )

        total += (
            float(item.product.price)
            * item.quantity
        )

    order = Order(
        user_id=user.id,
        total=total,
        status="Pending"
    )

    db.add(order)
    db.flush()

    for item in items:

        db.add(
            OrderItem(
                order_id=order.id,
                product_id=item.product_id,
                quantity=item.quantity,
                price=item.product.price
            )
        )

        item.product.stock -= item.quantity

        db.delete(item)

    db.commit()

    return {
        "ok": True,
        "order_id": order.id,
        "total": total
    }


@app.get("/api/orders")
def orders(
    request: Request,
    db: Session = Depends(get_db)
):

    user = current_user(request, db)

    if not user:
        raise HTTPException(
            401,
            "Please log in first."
        )

    rows = db.query(Order).filter(
        Order.user_id == user.id
    ).order_by(
        Order.created_at.desc()
    ).all()

    return [
        {
            "id": o.id,
            "total": float(o.total),
            "status": o.status,
            "created_at": o.created_at.isoformat(),
            "items": [
                {
                    "name": x.product.name,
                    "quantity": x.quantity,
                    "price": float(x.price)
                }
                for x in o.items
                if x.product
            ]
        }
        for o in rows
    ]


@app.post("/api/ai")
async def ai_endpoint(
    request: Request,
    db: Session = Depends(get_db)
):

    body = await request.json()

    message = str(
        body.get("message", "")
    ).strip()

    if not message:
        raise HTTPException(
            400,
            "Message is required."
        )

    user = current_user(request, db)

    answer = await ask_ai(
        message,
        db,
        user.id if user else None
    )

    return answer