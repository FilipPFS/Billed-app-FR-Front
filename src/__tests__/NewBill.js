import { screen, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES_PATH } from "../constants/routes.js";
import mockStore from "../__mocks__/store.js";

describe("Given I am connected as an employee", () => {
  const localStorageMock = {
    getItem: jest.fn(() => JSON.stringify({ email: "test@test.com" })),
    setItem: jest.fn(),
  };

  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
  });

  describe("When I am on NewBill Page", () => {
    test("Then the NewBill form should be displayed", () => {
      document.body.innerHTML = NewBillUI();

      const form = screen.getByTestId("form-new-bill");
      expect(form).toBeTruthy();
    });

    test("Then uploading a file with wrong format should trigger an alert", () => {
      document.body.innerHTML = NewBillUI();
      window.alert = jest.fn();

      new NewBill({
        document,
        onNavigate: jest.fn(),
        store: null,
        localStorage: localStorageMock,
      });

      const fileInput = screen.getByTestId("file");
      const file = new File(["test"], "test.pdf", {
        type: "application/pdf",
      });

      Object.defineProperty(fileInput, "files", {
        value: [file],
      });

      fileInput.dispatchEvent(new Event("change"));

      expect(window.alert).toHaveBeenCalled();
      expect(fileInput.value).toBe("");
    });

    test("Then submitting the form should call update and navigate to Bills", async () => {
      document.body.innerHTML = NewBillUI();

      const updateMock = jest.fn().mockResolvedValue();
      const onNavigate = jest.fn();

      const storeMock = {
        bills: () => ({
          update: updateMock,
        }),
      };

      const newBill = new NewBill({
        document,
        onNavigate,
        store: storeMock,
        localStorage: localStorageMock,
      });

      newBill.billId = "1234";

      const form = screen.getByTestId("form-new-bill");
      form.dispatchEvent(new Event("submit"));

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalled();
      });

      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
    });

    test("Then API error during file upload should trigger an alert", async () => {
      document.body.innerHTML = NewBillUI();
      window.alert = jest.fn();

      const createMock = jest.fn().mockRejectedValue(new Error("Erreur 500"));

      const storeMock = {
        bills: () => ({
          create: createMock,
        }),
      };

      new NewBill({
        document,
        onNavigate: jest.fn(),
        store: storeMock,
        localStorage: localStorageMock,
      });

      const fileInput = screen.getByTestId("file");
      const file = new File(["test"], "test.png", {
        type: "image/png",
      });

      Object.defineProperty(fileInput, "files", {
        value: [file],
      });

      fileInput.dispatchEvent(new Event("change"));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalled();
      });

      expect(fileInput.value).toBe("");
    });

    test("Then uploading a valid file should update the bill details", async () => {
      document.body.innerHTML = NewBillUI();

      const fileData = {
        fileUrl: "https://localhost:1234/test.png",
        key: "1234",
      };
      const createMock = jest.fn().mockResolvedValue(fileData);

      const storeMock = {
        bills: () => ({
          create: createMock,
        }),
      };

      const newBill = new NewBill({
        document,
        onNavigate: jest.fn(),
        store: storeMock,
        localStorage: localStorageMock,
      });

      const fileInput = screen.getByTestId("file");
      const file = new File(["test"], "test.png", { type: "image/png" });

      Object.defineProperty(fileInput, "files", { value: [file] });
      fileInput.dispatchEvent(new Event("change"));

      await waitFor(() => {
        expect(newBill.billId).toBe("1234");
        expect(newBill.fileUrl).toBe("https://localhost:1234/test.png");
        expect(newBill.fileName).toBe("test.png");
      });
    });
  });

  describe("When I submit a new bill - integration POST", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills");
    });

    test("Then it should call the API to update the bill and navigate to Bills", async () => {
      document.body.innerHTML = NewBillUI();
      const onNavigate = jest.fn();

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: localStorageMock,
      });

      newBill.billId = "47qAXb6fIm2zOKkLzMro";

      const form = screen.getByTestId("form-new-bill");
      form.dispatchEvent(new Event("submit"));

      await waitFor(() => {
        expect(mockStore.bills).toHaveBeenCalled();
      });

      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
    });

    test("Then it should handle a 404 error from the API", async () => {
      mockStore.bills.mockImplementationOnce(() => ({
        update: () => Promise.reject(new Error("Erreur 404")),
      }));

      document.body.innerHTML = NewBillUI();
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const newBill = new NewBill({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: localStorageMock,
      });

      newBill.billId = "47qAXb6fIm2zOKkLzMro";

      const form = screen.getByTestId("form-new-bill");
      form.dispatchEvent(new Event("submit"));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.objectContaining({ message: "Erreur 404" }),
        );
      });

      consoleErrorSpy.mockRestore();
    });

    test("Then it should handle a 500 error from the API", async () => {
      mockStore.bills.mockImplementationOnce(() => ({
        update: () => Promise.reject(new Error("Erreur 500")),
      }));

      document.body.innerHTML = NewBillUI();
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const newBill = new NewBill({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: localStorageMock,
      });

      newBill.billId = "47qAXb6fIm2zOKkLzMro";

      const form = screen.getByTestId("form-new-bill");
      form.dispatchEvent(new Event("submit"));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.objectContaining({ message: "Erreur 500" }),
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
